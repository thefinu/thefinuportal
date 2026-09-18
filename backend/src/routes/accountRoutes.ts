import express from 'express';
import Account from '../models/Account.js';
import { gasAuth } from '../middleware/gasAuthMiddleware.js';
import { auth } from '../middleware/authMiddleware.js';
import { findUserByEmail } from '../utils/userLookup.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { resolvePlaidCredentials } from '../utils/envCredentials.js';
import { plaidProxyOnly, withoutAccessToken, withoutAccessTokens } from '../utils/plaidProxyOnly.js';
import { plaidEnvFromToken } from '../utils/recordMode.js';
import SpreadsheetAccount from '../models/SpreadsheetAccount.js';
import { verifiedSpreadsheetId, SpreadsheetAccessError } from '../utils/spreadsheetAccess.js';
import { verifyPlaidWebhook } from '../utils/plaidWebhook.js';

const router = express.Router();

/**
 * Account records carry the Plaid access token. The add-on needed it while it called
 * Plaid itself; now that the server makes those calls, the token stops being sent —
 * but only once PLAID_PROXY_ONLY is on, because installs on older versions still
 * depend on it.
 */
const forClient = (account: any) => (plaidProxyOnly() ? withoutAccessToken(account) : account);
const listForClient = (accounts: any[]) => (plaidProxyOnly() ? withoutAccessTokens(accounts) : accounts);

// Resolves the OAuth-verified add-on caller to their user record.
async function callerUser(req: any) {
    const email = req.gasUser?.email;
    return email ? findUserByEmail(email) : null;
}

/**
 * The spreadsheet a request is about, checked against the caller's own spreadsheets.
 * '' when the caller sent no header, which an older add-on does not.
 */
async function callerSpreadsheetId(req: any, userId: unknown): Promise<string> {
    return verifiedSpreadsheetId(req, userId);
}

/**
 * Creates or updates a spreadsheet's link row, tolerating the unique-index race.
 *
 * Two requests upserting the same { spreadsheetId, account_id } — two sidebar tabs, a
 * retry, the parallel writes during a link — make one of them throw E11000. The row
 * exists either way, so the write is simply applied to it.
 */
async function upsertLinkRow(filter: Record<string, unknown>, update: Record<string, unknown>) {
    try {
        await SpreadsheetAccount.updateOne(filter as any, update as any, { upsert: true });
    } catch (err: any) {
        if (err?.code !== 11000) throw err;
        const { $setOnInsert, ...rest } = update as any;
        if (rest.$set) await SpreadsheetAccount.updateOne(filter as any, { $set: rest.$set } as any);
    }
}

/** Answers a request that named a spreadsheet belonging to someone else. */
function refuseForeignSpreadsheet(err: unknown, res: express.Response): boolean {
    if (!(err instanceof SpreadsheetAccessError)) return false;
    res.status(403).json({ message: 'This spreadsheet does not belong to you.' });
    return true;
}

/**
 * Presents accounts as the calling spreadsheet sees them.
 *
 * A bank connection is shared: every spreadsheet of the user can claim the same Plaid
 * Item rather than connect it again, which would be billed again. What is NOT shared is
 * each spreadsheet's own reading position and link state, which live in
 * spreadsheet_accounts — so those are overlaid here, at the single point where account
 * records reach the add-on.
 *
 * An account the calling spreadsheet has not claimed comes back is_linked:false with
 * connected_elsewhere:true, which is how the sidebar offers it for claiming.
 *
 * A caller that sends no spreadsheet header is an older add-on, and sees the account
 * records unchanged.
 */
async function withSpreadsheetView(accounts: any[], userId: unknown, spreadsheetId: string) {
    if (!spreadsheetId || accounts.length === 0) return accounts;

    const links = await SpreadsheetAccount.find({
        userId,
        spreadsheetId,
        account_id: { $in: accounts.map((a) => a.account_id).filter(Boolean) },
    } as any).lean();

    const linkByAccount = new Map(links.map((link: any) => [link.account_id, link]));

    return accounts.map((account) => {
        const plain = typeof account.toObject === 'function' ? account.toObject() : { ...account };
        const link = linkByAccount.get(plain.account_id);

        plain.is_linked = link ? link.is_linked === true : false;
        plain.is_update = link ? link.is_update === true : false;
        plain.next_cursor = link ? link.next_cursor : null;
        plain.linked_date = link ? link.linked_date : null;

        // True when another of the user's spreadsheets already connected this bank, so
        // the sidebar can offer to reuse that connection instead of creating a second
        // billed one.
        plain.connected_elsewhere = !link;

        return plain;
    });
}

/** The single-record form of withSpreadsheetView. */
async function withSpreadsheetViewOne(account: any, userId: unknown, spreadsheetId: string) {
    if (!account) return account;
    const [viewed] = await withSpreadsheetView([account], userId, spreadsheetId);
    return viewed;
}

/**
 * Marks every spreadsheet that syncs an Item as having updates waiting.
 *
 * Plaid reports new data once per Item, but several spreadsheets may be reading it,
 * each from its own cursor. Flagging only the shared record meant the first
 * spreadsheet to sync cleared the flag and the others never learned there was anything
 * to fetch.
 */
async function flagSpreadsheetsForItem(item_id: string): Promise<number> {
    const accounts = await Account.find({ item_id } as any).select('account_id').lean();
    const accountIds = accounts.map((a: any) => a.account_id).filter(Boolean);
    if (accountIds.length === 0) return 0;

    const result = await SpreadsheetAccount.updateMany(
        { account_id: { $in: accountIds }, is_linked: true } as any,
        { $set: { is_update: true } }
    );

    // Older add-on versions have no link rows and still read the shared record.
    await Account.updateMany({ item_id } as any, { $set: { is_update: true } });

    return result.modifiedCount;
}

// Get all accounts (admin). These records hold Plaid access tokens for every
// user; this route used to have no authentication at all.
router.get('/', auth, async (req, res) => {
    try {
        const accounts = await Account.find().populate('user_id', 'email isSubscribed cancelAtPeriodEnd currentPeriodEnd');
        res.json(accounts);
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        res.status(500).json({ message: err.message });
    }
});

// Fields an admin may set when creating an account by hand. Notably absent:
// access_token, item_id and isSubscribed — a hand-made account must not arrive with
// bank credentials or a paid plan attached.
const ADMIN_ACCOUNT_FIELDS = [
    'name', 'type', 'balance', 'color', 'user_id',
    'institution_name', 'account_type', 'account_subtype', 'mask', 'account_name', 'status',
];

// Create an account (admin)
router.post('/', auth, async (req, res) => {
    const payload: Record<string, unknown> = {};
    for (const field of ADMIN_ACCOUNT_FIELDS) {
        if (req.body && Object.prototype.hasOwnProperty.call(req.body, field)) {
            payload[field] = req.body[field];
        }
    }

    const account = new Account(payload);
    try {
        const newAccount = await account.save();
        res.status(201).json(newAccount);
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        res.status(400).json({ message: err.message });
    }
});



// Store Plaid accounts (authenticated GAS clients)
router.post('/store-plaid', gasAuth, async (req, res) => {
    try {
        // Once the server does the token exchange itself (/api/plaid/exchange), an
        // access token arriving from a client is no longer expected, and accepting one
        // would keep the old path alive. Off by default.
        if (plaidProxyOnly()) {
            return res.status(410).json({
                message: 'Please reload the TheFinU sidebar to finish connecting your bank.',
            });
        }

        const { plaid_item_id, access_token, accounts, metadata } = req.body;

        // Bind stored Plaid credentials to the OAuth-verified caller, so accounts
        // cannot be written against another user's record.
        const email = (req as any).gasUser?.email;

        if (!email) {
            return res.status(401).json({ message: 'Authenticated user email is required' });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Connecting a bank creates a billed Plaid Item, so it needs an active plan.
        if (!user.isSubscribed && !user.isFreeUser) {
            return res.status(402).json({ message: 'An active TheFinU subscription is required to connect bank accounts.' });
        }

        if (!accounts || !Array.isArray(accounts)) {
            return res.status(400).json({ message: 'Accounts array is required' });
        }

        // Which Plaid environment this token belongs to. The token names its own
        // environment, which is the more reliable of the two, so it wins; a
        // disagreement with the configured environment is logged because it means the
        // add-on and the server are pointed at different Plaids.
        const tokenEnv = plaidEnvFromToken(access_token);
        const settingsForEnv = await Settings.findOne();
        const configuredEnv = settingsForEnv
            ? resolvePlaidCredentials(settingsForEnv, user.email).environment
            : undefined;
        if (tokenEnv !== 'unknown' && configuredEnv && tokenEnv !== configuredEnv) {
            console.warn(
                `store-plaid: token is a ${tokenEnv} token but ${configuredEnv} is configured for this user.`
            );
        }
        const plaidEnv = tokenEnv !== 'unknown' ? tokenEnv : (configuredEnv || 'unknown');
        const spreadsheetId = await callerSpreadsheetId(req, user._id);

        const accountsResults = await Promise.all(accounts.map(async (acc: any) => {
            // Flexible mapping to handle different Plaid metadata/account structures
            const instId = metadata?.institution_id || metadata?.institution?.institution_id || acc.institution_id;
            const instName = metadata?.institution_name || metadata?.institution?.name || acc.institution_name || req.body.institution_name;
            const accType = acc.type || acc.account_type;
            const accSubtype = acc.subtype || acc.account_subtype;

            // Strings only in the filter: an object such as {"$exists": true} would
            // match every one of the caller's accounts and overwrite all their tokens.
            const asString = (value: unknown) => (typeof value === 'string' ? value : null);

            // One record per bank account per user. The connection is shared between
            // the user's spreadsheets — each claims it through a link row rather than
            // connecting the same bank again, which Plaid would bill again.
            const filter = {
                user_id: user._id,
                institution_id: asString(instId),
                mask: asString(acc.mask),
                account_name: asString(acc.name)
            };

            const update = {
                $set: {
                    account_id: acc.id || acc.account_id,
                    access_token: access_token,
                    item_id: plaid_item_id,
                    // Kept with the token: the two only work together.
                    plaidEnv: plaidEnv,
                },
                $setOnInsert: {
                    institution_name: instName,
                    account_type: accType,
                    account_subtype: accSubtype,
                    name: acc.name,
                    type: accType,
                    is_linked: false,
                    linked_date: null,
                    status: true,
                    is_update: false,
                    balance: 0,
                    color: '#3b82f6',
                    isSubscribed: user.isSubscribed,
                    // Which spreadsheet first connected this bank. Recorded for support
                    // and reporting; it does not decide who may sync the account, which
                    // is what the link rows are for.
                    spreadsheet_id: spreadsheetId || undefined
                }
            };

            return Account.findOneAndUpdate(filter, update, { upsert: true, new: true, runValidators: true });
        }));

        console.log('Processed accounts result IDs:', accountsResults.map(r => r?._id));

        res.status(200).json({
            message: 'Accounts processed successfully',
            count: accountsResults.length,
            userId: user._id
        });
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('Error processing plaid accounts:', err);
        // Detailed error logging for mongoose validation errors
        if (err.name === 'ValidationError') {
            console.error('Validation Errors:', err.errors);
        }
        res.status(500).json({ message: err.message, details: err.errors });
    }
});

// Plaid Webhook Endpoint
router.post('/plaid-webhook', async (req, res) => {
    try {
        // Anyone can reach this endpoint, so the signature is what separates a real
        // Plaid delivery from someone who guessed an item_id. Without it, each forged
        // call flagged every spreadsheet on that Item for sync — and every flag costs a
        // billed Plaid call.
        const genuine = await verifyPlaidWebhook(
            req.header('plaid-verification'),
            (req as any).rawBody
        );
        if (!genuine) {
            return res.status(401).json({ message: 'Webhook verification failed' });
        }

        const { webhook_type, webhook_code, item_id } = req.body;

        // item_id goes straight into an update query. A non-string such as
        // {"$ne": null} would match — and flag — every account in the database.
        if (typeof item_id !== 'string' || item_id.length === 0) {
            return res.status(400).json({ message: 'item_id must be a string' });
        }

        console.log(`Received Plaid webhook: ${webhook_type}/${webhook_code} for item: ${item_id}`);

        if (webhook_type === 'TRANSACTIONS' && webhook_code === 'SYNC_UPDATES_AVAILABLE') {
            const flagged = await flagSpreadsheetsForItem(item_id);
            console.log(`Flagged ${flagged} spreadsheet link(s) for item_id: ${item_id}`);
        }

        if (webhook_type === 'HOLDINGS' && webhook_code === 'DEFAULT_UPDATE') {
            const flagged = await flagSpreadsheetsForItem(item_id);
            console.log(`Flagged ${flagged} spreadsheet link(s) for item_id: ${item_id} (holdings)`);
        }

        // Always return 200 to Plaid to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('Error handling Plaid webhook:', err);
        // Still return 200/400/500? Plaid recommends 200 if you received it but failed to process to avoid retries if it's not a temporary failure
        res.status(500).json({ message: err.message });
    }
});

// Get accounts by item_id (authenticated GAS clients — own accounts only)
router.get('/get-by-item-id/:itemId', gasAuth, async (req, res) => {
    try {
        const { itemId } = req.params;

        const user = await callerUser(req);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const accounts = await Account.find({ item_id: itemId, user_id: user._id } as any);

        if (!accounts.length) {
            return res.status(404).json({ message: 'No accounts found for this item ID' });
        }

        const viewed = await withSpreadsheetView(accounts, user._id, await callerSpreadsheetId(req, user._id));
        res.status(200).json(listForClient(viewed));
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('Error fetching accounts by item_id:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get accounts by user email (authenticated GAS clients)
router.get('/get-by-email/:email', gasAuth, async (req, res) => {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Callers may only read their own accounts — these records hold Plaid
        // access tokens, so the requested email must match the verified identity.
        const callerEmail = (req as any).gasUser?.email;
        if (!callerEmail || callerEmail.toLowerCase() !== email.toLowerCase()) {
            return res.status(403).json({ message: 'You may only access your own accounts' });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Every account the user has connected, in any of their spreadsheets. Which of
        // them THIS spreadsheet syncs is carried by is_linked below; the rest are
        // offered for claiming rather than hidden.
        const accounts = await Account.find({ user_id: user._id, status: true });

        const viewed = await withSpreadsheetView(accounts, user._id, await callerSpreadsheetId(req, user._id));
        res.status(200).json(listForClient(viewed));
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('Error fetching accounts by email:', err);
        res.status(500).json({ message: err.message });
    }
});

// Update account details by account_id (authenticated GAS clients — own accounts only)
router.patch('/update-account/:account_id', gasAuth, async (req, res) => {
    try {
        const account_id = req.params.account_id as string;

        // Allowlist of the fields the add-on actually sends. This used to strip three
        // fields and $set everything else, so a caller could overwrite access_token,
        // item_id or isSubscribed on their own records. Unknown keys (including the
        // legacy `updates`) are ignored rather than rejected, so older add-on builds
        // keep working.
        const ALLOWED_FIELDS = ['name', 'is_linked', 'linked_date', 'status', 'is_update', 'next_cursor', 'balance'];
        const updateData: Record<string, unknown> = {};
        for (const field of ALLOWED_FIELDS) {
            if (req.body && Object.prototype.hasOwnProperty.call(req.body, field)) {
                const value = req.body[field];
                // Scalars only — an object value could carry query operators.
                if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
                    updateData[field] = value;
                }
            }
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No updatable fields supplied' });
        }

        const user = await callerUser(req);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Scoped to the caller: previously any authenticated Google user could
        // modify any account by its id.
        const account = await Account.findOne({ account_id, user_id: user._id } as any);
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const spreadsheetId = await callerSpreadsheetId(req, user._id);

        // Split the update between what describes the connection and what describes
        // one spreadsheet's use of it. The cursor, the link state and the pending-update
        // flag are per spreadsheet — writing them on the shared record is what let one
        // spreadsheet consume another's updates and rewind another's cursor.
        const PER_SPREADSHEET_FIELDS = ['is_linked', 'is_update', 'next_cursor', 'linked_date'];
        const sharedUpdate: Record<string, unknown> = {};
        const linkUpdate: Record<string, unknown> = {};

        for (const [field, value] of Object.entries(updateData)) {
            if (PER_SPREADSHEET_FIELDS.includes(field)) linkUpdate[field] = value;
            else sharedUpdate[field] = value;
        }

        if (Object.keys(sharedUpdate).length > 0) {
            await Account.updateOne({ _id: account._id }, { $set: sharedUpdate });
        }

        if (Object.keys(linkUpdate).length > 0) {
            if (!spreadsheetId) {
                // An older add-on, which has no spreadsheet to attribute this to. It
                // keeps writing to the shared record, exactly as it always did.
                await Account.updateOne({ _id: account._id }, { $set: linkUpdate });
            } else {
                // Upsert: linking an account the spreadsheet has not used before is how
                // it claims an existing connection, and that is the moment its own row
                // — and its own cursor — comes into being.
                //
                // Two of these racing on the unique index throw E11000. That means the
                // row now exists, which is what was wanted, so it is applied again
                // rather than failing the request.
                await upsertLinkRow(
                    { userId: user._id, spreadsheetId, account_id },
                    {
                        $set: linkUpdate,
                        $setOnInsert: {
                            accountRef: account._id,
                            status: true,
                        },
                    }
                );
            }
        }

        const updated = await Account.findById(account._id);
        const viewed = await withSpreadsheetViewOne(updated, user._id, spreadsheetId);
        res.json(forClient(viewed));
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        res.status(500).json({ message: err.message });
    }
});

// Get account by account_id (authenticated GAS clients — own accounts only)
router.get('/:account_id', gasAuth, async (req, res) => {
    try {
        const account_id = req.params.account_id as string;

        const user = await callerUser(req);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Scoped to the caller: this record includes the Plaid access token.
        const account = await Account.findOne({ account_id, user_id: user._id } as any);
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }
        const viewed = await withSpreadsheetViewOne(account, user._id, await callerSpreadsheetId(req, user._id));
        res.json(forClient(viewed));
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        res.status(500).json({ message: err.message });
    }
});

/**
 * Claims accounts that predate the spreadsheet field for the calling spreadsheet.
 *
 * An account created before accounts belonged to a spreadsheet has no spreadsheet_id,
 * and the database cannot tell which of a user's spreadsheets it belongs to — but the
 * spreadsheet can: the one holding that account in its own Accounts sheet is the one
 * using it. The add-on sends those IDs on open and this records the answer.
 *
 * Only unassigned accounts are ever claimed. An account already belonging to another
 * spreadsheet is left exactly as it is, so this can never move an account between
 * spreadsheets, however it is called.
 */
router.post('/claim', gasAuth, async (req, res) => {
    try {
        const user = await callerUser(req);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const spreadsheetId = await callerSpreadsheetId(req, user._id);
        if (!spreadsheetId) {
            return res.status(400).json({ message: 'X-Spreadsheet-Id header is required' });
        }

        // Strings only: an object here would become a query operator and could match
        // accounts the caller never named.
        const accountIds = Array.isArray(req.body?.account_ids)
            ? req.body.account_ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
            : [];

        if (accountIds.length === 0) {
            return res.json({ claimed: 0 });
        }

        // Only the caller's own accounts, and only ones that really exist.
        const accounts = await Account.find({
            user_id: user._id,
            account_id: { $in: accountIds },
        } as any).select('_id account_id next_cursor').lean();

        let claimed = 0;
        for (const account of accounts as any[]) {
            // The spreadsheet's cursor starts from the shared record's, so a
            // spreadsheet that was already syncing this account before link rows
            // existed carries on where it left off instead of re-importing.
            const result = await SpreadsheetAccount.updateOne(
                { spreadsheetId, account_id: account.account_id } as any,
                {
                    $setOnInsert: {
                        userId: user._id,
                        accountRef: account._id,
                        next_cursor: account.next_cursor || null,
                        is_linked: true,
                        is_update: false,
                        linked_date: new Date(),
                        status: true,
                    },
                },
                { upsert: true }
            );
            if (result.upsertedCount > 0) claimed++;
        }

        if (claimed > 0) {
            console.log(`Claimed ${claimed} account(s) for spreadsheet ${spreadsheetId}`);
        }

        res.json({ claimed });
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('Error claiming accounts:', err?.message);
        res.status(500).json({ message: 'Could not claim accounts' });
    }
});

// Plaid errors meaning the Item is already gone — safe to delete the account record.
const ITEM_ALREADY_GONE = ['ITEM_NOT_FOUND', 'INVALID_ACCESS_TOKEN'];

// Remove one of the caller's accounts (authenticated GAS clients — own accounts only).
// The add-on has always called this route, but it never existed, so removing an
// account failed for every user and its Plaid Item stayed billed. The add-on removes
// the Plaid Item itself once no other account on that Item remains.
router.delete('/remove/:account_id', gasAuth, async (req, res) => {
    try {
        const account_id = req.params.account_id as string;

        const user = await callerUser(req);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const spreadsheetId = await callerSpreadsheetId(req, user._id);

        // Removal is per spreadsheet, so a caller that does not say which spreadsheet it
        // means cannot be served. Falling through without one used to delete the shared
        // connection AND every other spreadsheet's link row and cursor — for a request
        // that merely omitted a header.
        if (!spreadsheetId) {
            return res.status(400).json({
                message: 'Please reload the TheFinU sidebar and try removing the account again.',
            });
        }

        const account = await Account.findOne({ account_id, user_id: user._id } as any);
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        // This spreadsheet stops syncing the account. The bank connection itself is
        // shared, so it survives as long as any other spreadsheet still uses it —
        // removing it here would stop those spreadsheets syncing and lose their
        // cursors, for a decision taken in a different file.
        await SpreadsheetAccount.deleteOne({ userId: user._id, spreadsheetId, account_id } as any);

        const remaining = await SpreadsheetAccount.countDocuments({
            userId: user._id,
            account_id,
        } as any);

        if (remaining > 0) {
            return res.json({
                message: 'Account removed from this spreadsheet',
                account_id,
                connectionKept: true,
                remaining,
            });
        }

        // Nothing else uses the connection — remove it for good. The add-on removes the
        // Plaid Item itself once no account on that Item remains. Every delete is scoped
        // by user, so one account's removal can never reach another user's rows.
        await Account.deleteOne({ _id: account._id, user_id: user._id } as any);
        await SpreadsheetAccount.deleteMany({ userId: user._id, account_id } as any);

        res.json({ message: 'Account removed', account_id, connectionKept: false });
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('Error removing account:', err);
        res.status(500).json({ message: 'Could not remove the account' });
    }
});

// Delete an account by its database id (admin). The admin panel has always called
// this route, but it never existed. When no other account shares the Plaid Item, the
// Item is removed first; if Plaid refuses, the account is kept so the access token
// isn't lost while the Item goes on being billed.
router.delete('/admin/:id', auth, async (req, res) => {
    try {
        const account = await Account.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        let plaidItemRemoved = false;
        if (account.item_id && account.access_token) {
            const siblings = await Account.countDocuments({ item_id: account.item_id, _id: { $ne: account._id } } as any);
            if (siblings === 0) {
                const owner = account.user_id ? await User.findById(account.user_id) : null;
                const settings = await Settings.findOne();
                const plaid = settings ? resolvePlaidCredentials(settings, owner?.email) : null;
                if (!plaid?.clientKey || !plaid?.secretKey) {
                    return res.status(500).json({ message: 'Plaid is not configured; the account was not deleted.' });
                }

                const response = await fetch(`${plaid.baseUrl}/item/remove`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        client_id: plaid.clientKey,
                        secret: plaid.secretKey,
                        access_token: account.access_token,
                    }),
                });
                if (response.ok) {
                    plaidItemRemoved = true;
                } else {
                    const err = await response.json().catch(() => ({})) as any;
                    if (!ITEM_ALREADY_GONE.includes(err?.error_code)) {
                        console.error(`Admin delete: Plaid item/remove failed: ${err?.error_code || response.status}`);
                        return res.status(502).json({
                            message: 'Plaid could not remove this connection, so the account was not deleted. Please try again.'
                        });
                    }
                }
            }
        }

        await Account.deleteOne({ _id: account._id });
        res.json({ message: 'Account deleted', plaidItemRemoved });
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('Admin account delete error:', err);
        res.status(500).json({ message: 'Could not delete the account' });
    }
});

export default router;
