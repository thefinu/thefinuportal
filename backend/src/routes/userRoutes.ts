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
import { findUserByEmail } from '../utils/userLookup.js';
import { removePlaidItemsForAccounts } from '../utils/plaidItems.js';
import SpreadsheetAccount from '../models/SpreadsheetAccount.js';

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

        // Case-insensitive: gasAuth lowercases, but stored emails may not be, and a
        // miss here would create a duplicate user record.
        let user = await findUserByEmail(email);
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
 * @route   DELETE /api/users/me
 * @desc    Removes the caller's own TheFinU account and all of its data.
 *
 * A user on a free plan has nothing to cancel and no refund to settle, so the
 * unsubscribe route deliberately keeps their data — which left them no way to remove
 * their account at all. This is that way.
 *
 * Anyone with a paying subscription is refused: cancelling one has refund rules, a
 * period end and Stripe state to settle, and that path already exists at
 * /payment/unsubscribe. Routing a paying customer through here would delete their data
 * while they were still being charged.
 */
router.delete('/me', gasAuth, async (req, res) => {
    try {
        const email = (req as any).gasUser?.email;
        if (!email) {
            return res.status(401).json({ status: 'error', message: 'Authenticated user email is required' });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const subscriptions = await Subscription.find({ userId: user._id });
        if (subscriptions.length > 0 && !user.isFreeUser) {
            return res.status(409).json({
                status: 'error',
                message: 'You have an active subscription. Please cancel that first.',
            });
        }

        // Plaid Items go before the accounts, so a connection is never left billed with
        // its only access token deleted. An Item that cannot be released keeps its
        // account (status false) instead of losing the token.
        const accounts = await Account.find({ user_id: user._id });
        const accountIds = accounts.map((a) => a._id);

        if (accountIds.length > 0) {
            await Transaction.deleteMany({ accountId: { $in: accountIds } } as any);
        }

        const { removableAccountIds } = await removePlaidItemsForAccounts(accounts, user.email);

        // Whatever the helper did not clear still holds a live Plaid Item, so those
        // accounts — and their access tokens — stay.
        const removable = new Set(removableAccountIds.map((id: any) => String(id)));
        const keptAccountIds = accounts
            .map((a) => a._id)
            .filter((id: any) => !removable.has(String(id)));

        await SpreadsheetAccount.deleteMany({ userId: user._id } as any);
        await Account.deleteMany({ _id: { $in: removableAccountIds } } as any);
        await UserSpreadsheet.deleteMany({ userId: user._id });
        await Subscription.deleteMany({ userId: user._id });

        // The user record survives when an Item could not be released, so the orphaned
        // connection still has an owner to retry from in the admin panel.
        if (keptAccountIds.length === 0) {
            await User.findByIdAndDelete(user._id);
        } else {
            console.error(`Kept user ${user.email}: ${keptAccountIds.length} Plaid Item(s) could not be removed.`);
        }

        res.json({
            status: 'success',
            message: 'Your TheFinU account and data have been removed.',
            removed: {
                accounts: removableAccountIds.length,
                accountsKept: keptAccountIds.length,
            },
        });
    } catch (err: any) {
        console.error('Self-delete error:', err?.message);
        res.status(500).json({ status: 'error', message: 'Could not remove your account. Please try again.' });
    }
});

/**
 * @route   GET /api/users
 * @desc    Get all users (for admin dashboard). Admin-only — previously unauthenticated.
 */
router.get('/', auth, async (req, res) => {
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

        const subscriptions = await Subscription.find({ userId: user._id });

        // Mark the user free and drop local subscription rows BEFORE touching
        // Stripe. Cancelling first let the resulting "subscription deleted" webhook
        // arrive while the user still looked like a paying, non-free customer — and
        // that handler deletes all of the user's data.
        await Subscription.deleteMany({ userId: user._id });
        user.isFreeUser = true;
        user.isSubscribed = true;
        user.currentPeriodEnd = null;
        user.cancelAtPeriodEnd = false;
        user.trialEnd = null;
        await user.save();

        // Refund and cancel all Stripe subscriptions for this user
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

        // Local subscription rows were already removed and the user marked free,
        // before Stripe was called — see above.

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

        // 4. Remove Plaid items before deleting accounts. This used to run only for
        // users who were neither subscribed nor free, and since nothing ever cleared
        // isSubscribed, almost every paying user's Items were left billed forever.
        // Accounts whose Item couldn't be removed are kept (status false) so the token
        // isn't lost.
        const { removableAccountIds } = await removePlaidItemsForAccounts(accounts, user.email);

        // 5. Delete accounts
        await Account.deleteMany({ _id: { $in: removableAccountIds } });

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
