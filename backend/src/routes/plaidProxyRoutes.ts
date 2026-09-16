import express from 'express';
import { gasAuth } from '../middleware/gasAuthMiddleware.js';
import { findUserByEmail } from '../utils/userLookup.js';
import Settings from '../models/Settings.js';
import Account from '../models/Account.js';
import { resolvePlaidCredentials } from '../utils/envCredentials.js';
import { plaidEnvFromToken } from '../utils/recordMode.js';

const router = express.Router();

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

        const results = await Promise.all(accounts.map(async (acc: any) => {
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
                    },
                },
                { upsert: true, new: true, runValidators: true },
            );
        }));

        res.json({
            message: 'Accounts stored',
            count: results.length,
            item_id: itemId,
        });
    } catch (err: any) {
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

        const account = await Account.findOne({ account_id, user_id: user._id } as any);
        if (!account || !account.access_token) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const response = await fetch(`${creds.baseUrl}/transactions/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: creds.clientKey,
                secret: creds.secretKey,
                access_token: account.access_token,
                cursor: account.next_cursor || undefined,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (err: any) {
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

        const account = await Account.findOne({ account_id, user_id: user._id } as any);
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
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (err: any) {
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

        const account = await Account.findOne({ account_id, user_id: user._id } as any);
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
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (err: any) {
        console.error('investments-holdings error:', err);
        res.status(500).json({ message: err.message });
    }
});

export default router;
