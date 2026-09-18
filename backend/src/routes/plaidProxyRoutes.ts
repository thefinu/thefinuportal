import express from 'express';
import { gasAuth } from '../middleware/gasAuthMiddleware.js';
import { findUserByEmail } from '../utils/userLookup.js';
import Settings from '../models/Settings.js';
import Account from '../models/Account.js';
import { resolvePlaidCredentials } from '../utils/envCredentials.js';
import { plaidEnvFromToken } from '../utils/recordMode.js';
import SpreadsheetAccount from '../models/SpreadsheetAccount.js';
import { verifiedSpreadsheetId, SpreadsheetAccessError } from '../utils/spreadsheetAccess.js';

const router = express.Router();

// Plaid errors meaning the Item is already gone, so removal counts as done.
const ITEM_ALREADY_GONE = ['ITEM_NOT_FOUND', 'INVALID_ACCESS_TOKEN'];

/**
 * Sends a Plaid failure in the shape the add-on already handles: HTTP 200 carrying
 * { error: true, error_code, ... }.
 *
 * Returning Plaid's own HTTP status instead loses the error code, and the add-on then
 * reports the status number rather than the reason — so ITEM_LOGIN_REQUIRED, which
 * needs the user to reconnect, looked the same as any other failure.
 */
function plaidFailure(res: express.Response, data: any) {
    return res.json({
        error: true,
        error_type: data?.error_type,
        error_code: data?.error_code,
        error_message: data?.error_message,
    });
}

/**
 * The spreadsheet a request is about, checked against the caller's own spreadsheets.
 * '' when the caller sent no header, which an older add-on does not.
 */
async function callerSpreadsheetId(req: any, userId: unknown): Promise<string> {
    return verifiedSpreadsheetId(req, userId);
}

/** Answers a request that named a spreadsheet belonging to someone else. */
function refuseForeignSpreadsheet(err: unknown, res: express.Response): boolean {
    if (!(err instanceof SpreadsheetAccessError)) return false;
    res.status(403).json({ message: 'This spreadsheet does not belong to you.' });
    return true;
}

/**
 * Finds one of the caller's accounts.
 *
 * The bank connection is shared between the user's spreadsheets — each claims it
 * rather than connecting the same bank again — so ownership is by user, not by
 * spreadsheet. What differs per spreadsheet is the cursor, which is read from the
 * link row below.
 */
async function findCallerAccount(user: any, account_id: unknown) {
    if (typeof account_id !== 'string' || account_id.length === 0) return null;
    return Account.findOne({ account_id, user_id: user._id } as any);
}

/**
 * The calling spreadsheet's reading position for an account.
 *
 * Only used when the caller sends no cursor of its own: the add-on drives pagination
 * and passes its cursor on every page. The shared record's cursor is the last resort,
 * for an add-on version that predates link rows.
 */
async function storedCursorFor(account: any, spreadsheetId: string): Promise<string> {
    if (spreadsheetId) {
        const link = await SpreadsheetAccount.findOne({
            userId: account.user_id,
            spreadsheetId,
            account_id: account.account_id,
        } as any).select('next_cursor').lean();
        if (link) return ((link as any).next_cursor as string) || '';
    }
    return account.next_cursor || '';
}

/**
 * Resolve Plaid credentials for the authenticated caller.
 */
async function plaidForCaller(req: any) {
    const email = req.gasUser?.email;
    if (!email) return null;

    const user = await findUserByEmail(email);
    if (!user) return null;

    if (!user.isSubscribed && !user.isFreeUser) return null;

    const settings = await Settings.findOne();
    if (!settings) return null;

    const creds = resolvePlaidCredentials(settings, email);
    return { user, creds, settings };
}

/**
 * POST /api/plaid/link-token
 * Create a Plaid Link token so the add-on can open Link without holding API keys.
 */
router.post('/link-token', gasAuth, async (req, res) => {
    try {
        const ctx = await plaidForCaller(req);
        if (!ctx) {
            return res.status(403).json({ message: 'Active subscription required' });
        }
        const { user, creds } = ctx;

        const response = await fetch(`${creds.baseUrl}/link/token/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: creds.clientKey,
                secret: creds.secretKey,
                user: { client_user_id: String(user._id) },
                client_name: 'TheFinU',
                products: req.body.products || ['transactions'],
                country_codes: req.body.country_codes || ['US'],
                language: 'en',
                webhook: creds.webhookUrl || undefined,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('link-token error:', err);
        res.status(500).json({ message: err.message });
    }
});

/**
 * POST /api/plaid/exchange
 * Exchange a public token for an access token and store accounts.
 */
router.post('/exchange', gasAuth, async (req, res) => {
    try {
        const ctx = await plaidForCaller(req);
        if (!ctx) {
            return res.status(403).json({ message: 'Active subscription required' });
        }
        const { user, creds } = ctx;
        const { public_token, metadata } = req.body;

        if (!public_token) {
            return res.status(400).json({ message: 'public_token is required' });
        }

        // Exchange the public token
        const exchangeRes = await fetch(`${creds.baseUrl}/item/public_token/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: creds.clientKey,
                secret: creds.secretKey,
                public_token,
            }),
        });

        const exchangeData = await exchangeRes.json() as any;
        if (!exchangeRes.ok) {
            return res.status(exchangeRes.status).json(exchangeData);
        }

        const accessToken = exchangeData.access_token;
        const itemId = exchangeData.item_id;
        const tokenEnv = plaidEnvFromToken(accessToken);
        const plaidEnv = tokenEnv !== 'unknown' ? tokenEnv : creds.environment;

        // Store accounts
        const accounts = metadata?.accounts || [];
        const instId = metadata?.institution?.institution_id;
        const instName = metadata?.institution?.name;

        const spreadsheetId = await callerSpreadsheetId(req, user._id);

        const results = await Promise.all(accounts.map(async (acc: any) => {
            // One record per bank account per user. The connection is shared between
            // the user's spreadsheets, each claiming it through a link row, so the same
            // bank is never connected — or billed — twice.
            const filter = {
                user_id: user._id,
                institution_id: instId || undefined,
                mask: acc.mask || undefined,
                account_name: acc.name || undefined,
            };

            return Account.findOneAndUpdate(
                filter,
                {
                    $set: {
                        account_id: acc.id,
                        access_token: accessToken,
                        item_id: itemId,
                        plaidEnv,
                    },
                    $setOnInsert: {
                        institution_name: instName,
                        account_type: acc.type,
                        account_subtype: acc.subtype,
                        name: acc.name,
                        type: acc.type,
                        is_linked: false,
                        linked_date: null,
                        status: true,
                        is_update: false,
                        balance: 0,
                        color: '#3b82f6',
                        isSubscribed: user.isSubscribed,
                        // Which spreadsheet first connected this bank. Recorded for
                        // support and reporting; who may sync it is decided by the
                        // link rows below.
                        spreadsheet_id: spreadsheetId || undefined,
                    },
                },
                { upsert: true, new: true, runValidators: true },
            );
        }));

        // Give the connecting spreadsheet its own row for each account, so it has a
        // cursor of its own from the start. Other spreadsheets can claim the same
        // connection later without connecting the bank again.
        if (spreadsheetId) {
            await Promise.all(results.map(async (account: any) => {
                if (!account?.account_id) return;
                await SpreadsheetAccount.updateOne(
                    { spreadsheetId, account_id: account.account_id } as any,
                    {
                        $setOnInsert: {
                            userId: user._id,
                            accountRef: account._id,
                            next_cursor: null,
                            is_linked: false,
                            is_update: false,
                            linked_date: null,
                            status: true,
                        },
                    },
                    { upsert: true }
                );
            }));
        }

        // success:true is what the add-on checks. Without it a completed link was
        // reported to the user as a failure, even though the accounts had been stored —
        // so people retried and linked the same bank twice.
        res.json({
            success: true,
            message: 'New Accounts Added Successfully',
            count: results.length,
            item_id: itemId,
        });
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('exchange error:', err);
        res.status(500).json({ message: err.message });
    }
});

/**
 * POST /api/plaid/transactions-sync
 * Server-side transactions/sync call.
 */
router.post('/transactions-sync', gasAuth, async (req, res) => {
    try {
        const ctx = await plaidForCaller(req);
        if (!ctx) {
            return res.status(403).json({ message: 'Active subscription required' });
        }
        const { user, creds } = ctx;
        const { account_id } = req.body;

        if (!account_id) {
            return res.status(400).json({ message: 'account_id is required' });
        }

        const account = await findCallerAccount(user, account_id);
        if (!account || !account.access_token) {
            return res.status(404).json({ message: 'Account not found' });
        }

        // The cursor comes from the caller, which is where it lives: the add-on drives
        // pagination page by page and checkpoints as it goes. Using the stored cursor
        // instead restarted from whatever the database happened to hold, so pages were
        // re-fetched or skipped mid-import. The stored value is only a fallback for a
        // caller that sends none.
        const cursor = typeof req.body?.cursor === 'string'
            ? req.body.cursor
            : await storedCursorFor(account, await callerSpreadsheetId(req, user._id));
        const requested = Number(req.body?.count);
        const count = requested > 0 ? Math.min(requested, 500) : 500;

        const response = await fetch(`${creds.baseUrl}/transactions/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: creds.clientKey,
                secret: creds.secretKey,
                access_token: account.access_token,
                cursor,
                count,
            }),
        });

        const data = await response.json() as any;
        if (!response.ok) {
            return plaidFailure(res, data);
        }

        // /transactions/sync returns every account on the Item, so without this filter
        // one account's sheet would be filled with a sibling account's transactions.
        // `removed` is deliberately not filtered: Plaid does not always include an
        // account_id on removed entries, and transaction ids are unique anyway.
        if (Array.isArray(data.added)) {
            data.added = data.added.filter((t: any) => t.account_id === account_id);
        }
        if (Array.isArray(data.modified)) {
            data.modified = data.modified.filter((t: any) => t.account_id === account_id);
        }

        res.json(data);
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('transactions-sync error:', err);
        res.status(500).json({ message: err.message });
    }
});

/**
 * POST /api/plaid/accounts-balance
 * Server-side accounts/balance/get call.
 */
router.post('/accounts-balance', gasAuth, async (req, res) => {
    try {
        const ctx = await plaidForCaller(req);
        if (!ctx) {
            return res.status(403).json({ message: 'Active subscription required' });
        }
        const { user, creds } = ctx;
        const { account_id } = req.body;

        if (!account_id) {
            return res.status(400).json({ message: 'account_id is required' });
        }

        const account = await findCallerAccount(user, account_id);
        if (!account || !account.access_token) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const response = await fetch(`${creds.baseUrl}/accounts/balance/get`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: creds.clientKey,
                secret: creds.secretKey,
                access_token: account.access_token,
                // Only the account that was asked for; the Item may hold several.
                options: { account_ids: [account_id] },
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            return plaidFailure(res, data);
        }

        res.json(data);
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('accounts-balance error:', err);
        res.status(500).json({ message: err.message });
    }
});

/**
 * POST /api/plaid/investments-holdings
 * Server-side investments/holdings/get call.
 */
router.post('/investments-holdings', gasAuth, async (req, res) => {
    try {
        const ctx = await plaidForCaller(req);
        if (!ctx) {
            return res.status(403).json({ message: 'Active subscription required' });
        }
        const { user, creds } = ctx;
        const { account_id } = req.body;

        if (!account_id) {
            return res.status(400).json({ message: 'account_id is required' });
        }

        const account = await findCallerAccount(user, account_id);
        if (!account || !account.access_token) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const response = await fetch(`${creds.baseUrl}/investments/holdings/get`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: creds.clientKey,
                secret: creds.secretKey,
                access_token: account.access_token,
                options: { account_ids: [account_id] },
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            // PRODUCTS_NOT_SUPPORTED travels through here too; the add-on reads it as
            // "this bank has no investments" and skips the account.
            return plaidFailure(res, data);
        }

        res.json(data);
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('investments-holdings error:', err);
        res.status(500).json({ message: err.message });
    }
});

/**
 * POST /api/plaid/item
 * Reads the Plaid Item behind one account, to see which products it supports.
 */
router.post('/item', gasAuth, async (req, res) => {
    try {
        const ctx = await plaidForCaller(req);
        if (!ctx) {
            return res.status(403).json({ message: 'Active subscription required' });
        }
        const { user, creds } = ctx;
        const { account_id } = req.body;

        if (!account_id) {
            return res.status(400).json({ message: 'account_id is required' });
        }

        const account = await findCallerAccount(user, account_id);
        if (!account || !account.access_token) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const response = await fetch(`${creds.baseUrl}/item/get`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: creds.clientKey,
                secret: creds.secretKey,
                access_token: account.access_token,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            return plaidFailure(res, data);
        }

        res.json(data);
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('item error:', err);
        res.status(500).json({ message: err.message });
    }
});

/**
 * POST /api/plaid/item/remove-if-orphaned
 *
 * Removes the Plaid Item behind an account when no other account of this user still
 * uses it, so Plaid stops billing for the connection. Call it BEFORE deleting the
 * account: afterwards there is no record of which Item it belonged to.
 *
 * Anything other than success returns removed:false, and the caller keeps the account
 * rather than losing the only copy of its access token.
 */
router.post('/item/remove-if-orphaned', gasAuth, async (req, res) => {
    try {
        const ctx = await plaidForCaller(req);
        if (!ctx) {
            return res.status(403).json({ message: 'Active subscription required' });
        }
        const { user, creds } = ctx;
        const { account_id } = req.body;

        if (!account_id) {
            return res.status(400).json({ message: 'account_id is required' });
        }

        const account = await findCallerAccount(user, account_id);
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }
        if (!account.item_id || !account.access_token) {
            return res.json({ removed: false, reason: 'no-item' });
        }

        const siblings = await Account.countDocuments({
            item_id: account.item_id,
            user_id: user._id,
            _id: { $ne: account._id },
        } as any);

        if (siblings > 0) {
            return res.json({ removed: false, reason: 'in-use', remaining: siblings });
        }

        // The connection is shared, so another spreadsheet may still be syncing this
        // account. Removing the Item would stop it dead and lose its cursor.
        //
        // The caller's own spreadsheet is excluded by id. When no id was sent, nothing
        // is excluded: writing { $ne: '' } instead matched the caller's own row, so the
        // Item looked in use by someone else and was never removed — every disconnect
        // from an older add-on left a billed connection behind.
        const spreadsheetId = await callerSpreadsheetId(req, user._id);
        const otherSpreadsheetFilter: Record<string, unknown> = {
            userId: user._id,
            account_id: account.account_id,
        };
        if (spreadsheetId) otherSpreadsheetFilter.spreadsheetId = { $ne: spreadsheetId };

        const otherSpreadsheets = await SpreadsheetAccount.countDocuments(otherSpreadsheetFilter as any);

        if (otherSpreadsheets > 0) {
            return res.json({ removed: false, reason: 'used-by-other-spreadsheet', remaining: otherSpreadsheets });
        }

        const response = await fetch(`${creds.baseUrl}/item/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: creds.clientKey,
                secret: creds.secretKey,
                access_token: account.access_token,
            }),
        });

        if (response.ok) {
            return res.json({ removed: true });
        }

        const err = (await response.json().catch(() => ({}))) as any;
        if (ITEM_ALREADY_GONE.includes(err?.error_code)) {
            return res.json({ removed: true, reason: 'already-gone' });
        }

        console.error(`item/remove refused for account ${account_id}: ${err?.error_code || response.status}`);
        res.json({ removed: false, reason: 'plaid-refused' });
    } catch (err: any) {
        if (refuseForeignSpreadsheet(err, res)) return;
        console.error('item/remove-if-orphaned error:', err);
        res.status(500).json({ message: err.message });
    }
});

export default router;
