import express from 'express';
import Stripe from 'stripe';
import User from '../models/User.js';
import UserSpreadsheet from '../models/UserSpreadsheet.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Subscription from '../models/Subscription.js';
import Settings from '../models/Settings.js';
import { gasAuth } from '../middleware/gasAuthMiddleware.js';
import { auth } from '../middleware/authMiddleware.js';
import { refundSubscription } from '../utils/stripeRefund.js';
import { resolvePlaidCredentials } from '../utils/envCredentials.js';

const router = express.Router();

/**
 * @route   POST /api/users/validate-user
 * @desc    Validate user exists, create if not, and sync spreadsheet ID
 */
router.post('/validate-user', gasAuth, async (req, res) => {
    try {
        const { spreadsheetId } = req.body;

        // Use the OAuth-verified identity rather than the request body, so a caller
        // cannot read or modify another user's record by passing their email.
        const email = (req as any).gasUser?.email;

        if (!email) {
            return res.status(401).json({ status: 'error', message: 'Authenticated user email is required' });
        }

        let user = await User.findOne({ email });
        let spreadsheetCreated = false;
        let userCreated = false;

        if (!user) {
            // Step 3: Create user record if not exists
            user = new User({ email });
            await user.save();
            userCreated = true;

            // Also create spreadsheet record if spreadsheetId is provided
            if (spreadsheetId) {
                const newSpreadsheet = new UserSpreadsheet({
                    userId: user._id,
                    spreadsheetId: spreadsheetId
                });
                await newSpreadsheet.save();
                spreadsheetCreated = true;
            }
        } else {
            // Step 4: If exists, check spreadsheet_id and create if not exists
            if (spreadsheetId) {
                const existingSpreadsheet = await UserSpreadsheet.findOne({
                    userId: user._id,
                    spreadsheetId: spreadsheetId
                });

                if (!existingSpreadsheet) {
                    const newSpreadsheet = new UserSpreadsheet({
                        userId: user._id,
                        spreadsheetId: spreadsheetId
                    });
                    await newSpreadsheet.save();
                    spreadsheetCreated = true;
                }
            }
        }

        res.json({
            status: 'success',
            message: userCreated
                ? 'User and spreadsheet created successfully'
                : (spreadsheetCreated ? 'Spreadsheet synced successfully' : 'User already exists and spreadsheet is up to date'),
            data: {
                userId: user._id,
                email: user.email,
                isSubscribed: user.isSubscribed,
                isFreeUser: user.isFreeUser,
                currentPeriodEnd: user.currentPeriodEnd,
                cancelAtPeriodEnd: user.cancelAtPeriodEnd,
                userCreated,
                spreadsheetCreated
            }
        });
    } catch (err: any) {
        console.error('User sync error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

/**
 * @route   GET /api/users
 * @desc    Get all users (for admin dashboard)
 */
router.get('/', async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @route   POST /api/users/:id/set-free-user
 * @desc    Cancel Stripe subscription and set user as a permanent free user
 */
router.post('/:id/set-free-user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isFreeUser) {
            return res.status(400).json({ message: 'User is already a free user' });
        }

        // Refund and cancel all Stripe subscriptions for this user
        const subscriptions = await Subscription.find({ userId: user._id });
        const refunds: string[] = [];
        if (subscriptions.length > 0) {
            try {
                const settings = await Settings.findOne();
                if (settings?.stripeSecretKey) {
                    const stripe = new Stripe(settings.stripeSecretKey, {
                        apiVersion: '2024-12-18.acacia' as any,
                    });

                    for (const sub of subscriptions) {
                        try {
                            // Refund before canceling
                            const refund = await refundSubscription(stripe, sub.stripeSubscriptionId);
                            if (refund) {
                                refunds.push(`${refund.amount / 100} ${refund.currency}`);
                            }
                            await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
                        } catch (stripeErr: any) {
                            if (stripeErr.code !== 'resource_missing') {
                                console.error(`Failed to cancel Stripe sub ${sub.stripeSubscriptionId}:`, stripeErr.message);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Stripe cleanup error during set-free-user:', err);
            }
        }

        // Delete subscription records from DB
        await Subscription.deleteMany({ userId: user._id });

        // Set user as free user with permanent access
        user.isFreeUser = true;
        user.isSubscribed = true;
        user.currentPeriodEnd = null;
        user.cancelAtPeriodEnd = false;
        user.trialEnd = null;
        await user.save();

        // Update all accounts to subscribed
        await Account.updateMany({ user_id: user._id }, { isSubscribed: true });

        res.json({
            status: 'success',
            message: `User ${user.email} has been set as a free user`,
            refunds: refunds.length > 0 ? refunds : undefined,
        });
    } catch (err: any) {
        console.error('Set free user error:', err);
        res.status(500).json({ message: err.message || 'Failed to set free user' });
    }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user and all related data (accounts, transactions, subscriptions, spreadsheets, Stripe)
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 1. Refund, cancel, and delete Stripe subscriptions
        const subscriptions = await Subscription.find({ userId: user._id });
        if (subscriptions.length > 0) {
            try {
                const settings = await Settings.findOne();
                if (settings?.stripeSecretKey) {
                    const stripe = new Stripe(settings.stripeSecretKey, {
                        apiVersion: '2024-12-18.acacia' as any,
                    });

                    for (const sub of subscriptions) {
                        try {
                            // Refund before canceling
                            await refundSubscription(stripe, sub.stripeSubscriptionId);
                            await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
                        } catch (stripeErr: any) {
                            // Ignore if subscription already canceled or missing
                            if (stripeErr.code !== 'resource_missing') {
                                console.error(`Failed to cancel Stripe sub ${sub.stripeSubscriptionId}:`, stripeErr.message);
                            }
                        }
                    }

                    // Delete Stripe customer if exists
                    const customerId = subscriptions[0]?.stripeCustomerId;
                    if (customerId) {
                        try {
                            await stripe.customers.del(customerId);
                        } catch (stripeErr: any) {
                            if (stripeErr.code !== 'resource_missing') {
                                console.error(`Failed to delete Stripe customer ${customerId}:`, stripeErr.message);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Stripe cleanup error:', err);
            }
        }

        // 2. Delete subscriptions from DB
        await Subscription.deleteMany({ userId: user._id });

        // 3. Delete transactions for all user accounts
        const accounts = await Account.find({ user_id: user._id });
        const accountIds = accounts.map(a => a._id);
        if (accountIds.length > 0) {
            await Transaction.deleteMany({ accountId: { $in: accountIds } });
        }

        // 4. If unsubscribed and not a free user, remove Plaid items before deleting accounts
        if (!user.isSubscribed && !user.isFreeUser && accounts.length > 0) {
            try {
                const settings = await Settings.findOne();
                const plaid = settings ? resolvePlaidCredentials(settings, user.email) : null;
                if (plaid?.clientKey && plaid?.secretKey) {
                    const plaidBaseUrl = plaid.baseUrl;

                    // Deduplicate access tokens — one item/remove call per linked item
                    const uniqueTokens = [...new Set(
                        accounts.map(a => a.access_token).filter(Boolean)
                    )];

                    for (const access_token of uniqueTokens) {
                        try {
                            const response = await fetch(`${plaidBaseUrl}/item/remove`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    client_id: plaid.clientKey,
                                    secret: plaid.secretKey,
                                    access_token,
                                }),
                            });
                            if (!response.ok) {
                                const err = await response.json() as any;
                                console.error(`Plaid item/remove failed for token: ${err?.error_message}`);
                            }
                        } catch (plaidErr: any) {
                            console.error('Plaid item/remove error:', plaidErr.message);
                        }
                    }
                }
            } catch (err) {
                console.error('Plaid cleanup error during user delete:', err);
            }
        }

        // 5. Delete accounts
        await Account.deleteMany({ user_id: user._id });

        // 6. Delete spreadsheet records
        await UserSpreadsheet.deleteMany({ userId: user._id });

        // 7. Delete the user
        await User.findByIdAndDelete(user._id);

        res.json({
            status: 'success',
            message: `User ${user.email} and all related data deleted successfully`,
            deleted: {
                subscriptions: subscriptions.length,
                accounts: accounts.length,
                transactions: accountIds.length > 0 ? 'cleared' : 'none',
            }
        });
    } catch (err: any) {
        console.error('Delete user error:', err);
        res.status(500).json({ message: err.message || 'Failed to delete user' });
    }
});

export default router;
