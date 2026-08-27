import express from 'express';
import User from '../models/User.js';
import Account from '../models/Account.js';
import Subscription from '../models/Subscription.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const subscribedUsers = await User.countDocuments({ isSubscribed: true });

        // Connected Accounts (where status: true as per previous modification)
        const totalAccounts = await Account.countDocuments();
        const activeAccounts = await Account.countDocuments({ status: true });

        // Calculate total revenue from active subscriptions using aggregation
        const revenueAgg = await Subscription.aggregate([
            { $match: { status: { $in: ['active', 'paid'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        res.json({
            totalUsers,
            subscribedUsers,
            totalAccounts,
            activeAccounts,
            totalRevenue,
            // Growth percentages (mocked for now or calculated if we had history)
            userGrowth: "+12%",
            accountGrowth: "+5%"
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
