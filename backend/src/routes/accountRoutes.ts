import express from 'express';
import Account from '../models/Account.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { auth } from '../middleware/authMiddleware.js';
import { gasAuth } from '../middleware/gasAuthMiddleware.js';

const router = express.Router();

// Get all accounts
router.get('/', async (req, res) => {
    try {
        const accounts = await Account.find().populate('user_id', 'email isSubscribed cancelAtPeriodEnd currentPeriodEnd');
        res.json(accounts);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: Delete account by MongoDB _id, remove from Plaid if last account for that item
router.delete('/admin/:id', auth, async (req, res) => {
    try {
        const account = await Account.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const itemId = account.item_id;
        const accessToken = account.access_token;

        await Account.findByIdAndDelete(req.params.id);

        // If this was the last account for the Plaid item, remove the item from Plaid
        if (itemId && accessToken) {
            const remaining = await Account.countDocuments({ item_id: itemId });
            if (remaining === 0) {
                try {
                    const settings = await Settings.findOne();
                    if (settings?.plaidClientKey && settings?.plaidSecretKey) {
                        const plaidBaseUrl = `https://${settings.plaidEnvironment || 'sandbox'}.plaid.com`;
                        const plaidRes = await fetch(`${plaidBaseUrl}/item/remove`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                client_id: settings.plaidClientKey,
                                secret: settings.plaidSecretKey,
                                access_token: accessToken,
                            }),
                        });
                        const plaidResult = await plaidRes.json();
                        console.log(`Plaid item/remove for ${itemId}:`, plaidResult);
                    }
                } catch (plaidErr) {
                    console.error('Plaid item removal failed (non-blocking):', plaidErr);
                }
            }
        }

        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (err: any) {
        console.error('Error deleting account:', err);
        res.status(500).json({ message: err.message });
    }
});

// Create an account
router.post('/', async (req, res) => {
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
        const { email, plaid_item_id, access_token, accounts, metadata } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!accounts || !Array.isArray(accounts)) {
            return res.status(400).json({ message: 'Accounts array is required' });
        }

        const accountsResults = await Promise.all(accounts.map(async (acc: any) => {
            // Flexible mapping to handle different Plaid metadata/account structures
            const instId = metadata?.institution_id || metadata?.institution?.institution_id || acc.institution_id;
            const instName = metadata?.institution_name || metadata?.institution?.name || acc.institution_name || req.body.institution_name;
            const accType = acc.type || acc.account_type;
            const accSubtype = acc.subtype || acc.account_subtype;

            const filter = {
                user_id: user._id,
                institution_id: instId,
                mask: acc.mask,
                account_name: acc.name
            };

            const update = {
                $set: {
                    account_id: acc.id || acc.account_id,
                    access_token: access_token,
                    item_id: plaid_item_id,
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
        // Always return 200 to Plaid to acknowledge receipt and prevent infinite retries
        res.status(200).json({ received: true, error: err.message });
    }
});

// Get accounts by item_id (authenticated GAS clients)
router.get('/get-by-item-id/:itemId', gasAuth, async (req, res) => {
    try {
        const { itemId } = req.params;

        const accounts = await Account.find({ item_id: itemId } as any);

        if (!accounts.length) {
            return res.status(404).json({ message: 'No accounts found for this item ID' });
        }

        res.status(200).json(accounts);
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

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const accounts = await Account.find({ user_id: user._id });

        res.status(200).json(accounts);
    } catch (err: any) {
        console.error('Error fetching accounts by email:', err);
        res.status(500).json({ message: err.message });
    }
});

// Delete account by account_id (authenticated GAS clients)
router.delete('/remove/:account_id', gasAuth, async (req, res) => {
    try {
        const account_id = req.params.account_id as string;
        const account = await Account.findOneAndDelete({ account_id } as any);

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (err: any) {
        console.error('Error deleting account:', err);
        res.status(500).json({ message: err.message });
    }
});

// Update account details by account_id (authenticated GAS clients)
router.patch('/update-account/:account_id', gasAuth, async (req, res) => {
    try {
        const account_id = req.params.account_id as string;
        const updateData = req.body;

        // Prevent updating sensitive official fields if necessary
        delete updateData.account_id;
        delete updateData.account_name;
        delete updateData.user_id;

        const account = await Account.findOneAndUpdate(
            { account_id } as any,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.json(account);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Get account by account_id (authenticated GAS clients)
router.get('/:account_id', gasAuth, async (req, res) => {
    try {
        const account_id = req.params.account_id as string;
        const account = await Account.findOne({ account_id } as any);
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }
        res.json(account);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
