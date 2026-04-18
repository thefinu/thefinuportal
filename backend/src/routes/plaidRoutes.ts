import express from 'express';
import mongoose from 'mongoose';
import PlaidPricing from '../models/PlaidPricing.js';
import PlaidUsage from '../models/PlaidUsage.js';
import User from '../models/User.js';
import { auth } from '../middleware/authMiddleware.js';

// Maps billing type from payload to the product name in plaid_pricing
const BILLING_PRODUCT_MAP: Record<string, string> = {
    link_token_create:          'Liabilities',
    item_public_token_exchange: 'Free of Costs',
    transactions_sync:          'Transactions',
    accounts_balance_get:       'Balance',
    investments_holdings_get:   'Investments Holdings',
    item_get:                   'Free of Costs',
};

const router = express.Router();

// POST /api/plaid/usage/log — log a Plaid API usage event
router.post('/usage/log', async (req, res) => {
    try {
        const { email, billing, endpoint, status, timestamp } = req.body;

        if (!email || !billing || !endpoint) {
            return res.status(400).json({ message: 'email, billing, and endpoint are required' });
        }

        if (!(billing in BILLING_PRODUCT_MAP)) {
            return res.status(400).json({ message: `Unknown billing type: ${billing}` });
        }

        // 1. Resolve user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: `User not found: ${email}` });
        }

        // 2. Resolve pricing from plaid_pricing
        const productName = BILLING_PRODUCT_MAP[billing];
        const pricing = await PlaidPricing.findOne({ product: productName });
        if (!pricing) {
            return res.status(404).json({ message: `Pricing not configured for product: ${productName}` });
        }

        // 3. Create usage record
        const usage = new PlaidUsage({
            userId: user._id,
            productId: pricing._id,
            endpoint,
            price: pricing.rate,
            billing,
            status: status ?? '',
            timestamp: timestamp ? new Date(timestamp) : new Date(),
        });

        await usage.save();

        res.status(201).json({ status: 'success', message: 'Usage logged', data: usage });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/plaid/usage — get all usage records (admin)
router.get('/usage', auth, async (req, res) => {
    try {
        const usage = await PlaidUsage.find()
            .populate('userId', 'email')
            .populate('productId', 'product rate perCall perMonth')
            .sort({ createdAt: -1 });
        res.json(usage);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/plaid/usage/user/:userId/monthly — monthly invoice summary (admin)
router.get('/usage/user/:userId/monthly', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const now = new Date();
        const year  = parseInt(req.query.year  as string) || now.getFullYear();
        const month = parseInt(req.query.month as string) || now.getMonth() + 1;

        const startDate = new Date(year, month - 1, 1);
        const endDate   = new Date(year, month,     1);

        // All billable products (exclude rate=0 / Free of Costs)
        const allPricing = await PlaidPricing.find({ rate: { $gt: 0 } }).sort({ product: 1 });

        // Aggregate usage for this user in the selected month
        const usageAgg = await PlaidUsage.aggregate([
            {
                $match: {
                    userId:    new mongoose.Types.ObjectId(userId),
                    timestamp: { $gte: startDate, $lt: endDate },
                    price:     { $gt: 0 },
                },
            },
            {
                $group: {
                    _id:      '$productId',
                    quantity: { $sum: 1 },
                    amount:   { $sum: '$price' },
                },
            },
        ]);

        const usageMap = new Map(usageAgg.map(u => [u._id?.toString(), u]));

        const items = allPricing.map(p => {
            const hit = usageMap.get((p._id as any).toString());
            return {
                product:   p.product,
                unitPrice: p.rate,
                quantity:  hit?.quantity ?? 0,
                amount:    hit?.amount   ?? 0,
            };
        });

        const subtotal = items.reduce((sum, i) => sum + i.amount, 0);

        res.json({ year, month, items, subtotal });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/plaid/usage/user/:userId — get usage for a specific user (admin)
router.get('/usage/user/:userId', auth, async (req, res) => {
    try {
        const usage = await PlaidUsage.find({ userId: req.params.userId })
            .populate('productId', 'product rate perCall perMonth')
            .sort({ createdAt: -1 });
        res.json(usage);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/plaid/pricing — get all pricing models (admin)
router.get('/pricing', auth, async (req, res) => {
    try {
        const pricing = await PlaidPricing.find().sort({ product: 1 });
        res.json(pricing);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/plaid/pricing — create a pricing model (admin)
router.post('/pricing', auth, async (req, res) => {
    try {
        const { product, rate, perCall, perMonth } = req.body;
        if (!product || rate === undefined) {
            return res.status(400).json({ message: 'product and rate are required' });
        }
        const pricing = new PlaidPricing({ product, rate, perCall, perMonth });
        await pricing.save();
        res.status(201).json(pricing);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/plaid/pricing/:id — update a pricing model (admin)
router.put('/pricing/:id', auth, async (req, res) => {
    try {
        const { product, rate, perCall, perMonth } = req.body;
        const pricing = await PlaidPricing.findByIdAndUpdate(
            req.params.id,
            { product, rate, perCall, perMonth },
            { new: true, runValidators: true }
        );
        if (!pricing) return res.status(404).json({ message: 'Pricing model not found' });
        res.json(pricing);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/plaid/pricing/:id — delete a pricing model (admin)
router.delete('/pricing/:id', auth, async (req, res) => {
    try {
        const pricing = await PlaidPricing.findByIdAndDelete(req.params.id);
        if (!pricing) return res.status(404).json({ message: 'Pricing model not found' });
        res.json({ message: 'Pricing model deleted' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
