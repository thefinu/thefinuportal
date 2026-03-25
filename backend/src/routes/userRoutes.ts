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

const router = express.Router();

/**
 * @route   POST /api/users/validate-user
 * @desc    Validate user exists, create if not, and sync spreadsheet ID
 */
router.post('/validate-user', gasAuth, async (req, res) => {
    try {
        const { email, spreadsheetId } = req.body;

        if (!email) {
            return res.status(400).json({ status: 'error', message: 'Email is required' });
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
 * @route   DELETE /api/users/:id
 * @desc    Delete a user and all related data (accounts, transactions, subscriptions, spreadsheets, Stripe)
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 1. Cancel and delete Stripe subscriptions
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

        // 4. Delete accounts
        await Account.deleteMany({ user_id: user._id });

        // 5. Delete spreadsheet records
        await UserSpreadsheet.deleteMany({ userId: user._id });

        // 6. Delete the user
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
