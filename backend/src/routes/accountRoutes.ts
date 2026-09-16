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

// Get all accounts (admin). These records hold Plaid access tokens for every
// user; this route used to have no authentication at all.
router.get('/', auth, async (req, res) => {
    try {
        const accounts = await Account.find().populate('user_id', 'email isSubscribed cancelAtPeriodEnd currentPeriodEnd');
        res.json(accounts);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Create an account (admin)
router.post('/', auth, async (req, res) => {
    const account = new Account(req.body);
    try {
        const newAccount = await account.save();
        res.status(201).json(newAccount);
    } catch (err: any) {
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

        const accountsResults = await Promise.all(accounts.map(async (acc: any) => {
            // Flexible mapping to handle different Plaid metadata/account structures
            const instId = metadata?.institution_id || metadata?.institution?.institution_id || acc.institution_id;
            const instName = metadata?.institution_name || metadata?.institution?.name || acc.institution_name || req.body.institution_name;
            const accType = acc.type || acc.account_type;
            const accSubtype = acc.subtype || acc.account_subtype;

            // Strings only in the filter: an object such as {"$exists": true} would
            // match every one of the caller's accounts and overwrite all their tokens.
            const asString = (value: unknown) => (typeof value === 'string' ? value : null);
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
                    isSubscribed: user.isSubscribed
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
        const { webhook_type, webhook_code, item_id } = req.body;

        // item_id goes straight into an update query. A non-string such as
        // {"$ne": null} would match — and flag — every account in the database.
        if (typeof item_id !== 'string' || item_id.length === 0) {
            return res.status(400).json({ message: 'item_id must be a string' });
        }

        console.log(`Received Plaid webhook: ${webhook_type}/${webhook_code} for item: ${item_id}`);

        if (webhook_type === 'TRANSACTIONS' && webhook_code === 'SYNC_UPDATES_AVAILABLE') {
            const result = await Account.updateMany(
                { item_id: item_id },
                { $set: { is_update: true } }
            );
            console.log(`Updated ${result.modifiedCount} accounts for item_id: ${item_id} to is_update: true`);
        }

        if (webhook_type === 'HOLDINGS' && webhook_code === 'DEFAULT_UPDATE') {
            const result = await Account.updateMany(
                { item_id: item_id },
                { $set: { is_update: true } }
            );
            console.log(`Updated ${result.modifiedCount} accounts for item_id: ${item_id} to is_update: true (holdings)`);
        }

        // Always return 200 to Plaid to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (err: any) {
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

        res.status(200).json(listForClient(accounts));
    } catch (err: any) {
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

        const accounts = await Account.find({ user_id: user._id, status: true });

        res.status(200).json(listForClient(accounts));
    } catch (err: any) {
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
        const account = await Account.findOneAndUpdate(
            { account_id, user_id: user._id } as any,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.json(forClient(account));
    } catch (err: any) {
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
        res.json(forClient(account));
    } catch (err: any) {
        res.status(500).json({ message: err.message });
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

        const deleted = await Account.findOneAndDelete({ account_id, user_id: user._id } as any);
        if (!deleted) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.json({ message: 'Account removed', account_id });
    } catch (err: any) {
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
        console.error('Admin account delete error:', err);
        res.status(500).json({ message: 'Could not delete the account' });
    }
});

export default router;
