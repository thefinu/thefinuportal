import express from 'express';
import type Stripe from 'stripe';
import Plan from '../models/Plan.js';
import { getStripe } from '../utils/stripeClient.js';
import { auth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Convert a major-unit amount (e.g. 29.00) to the smallest currency unit (cents) for Stripe.
const toStripeAmount = (amount: number): number => Math.round(Number(amount) * 100);

// A sale price (when set) must be a positive amount below the regular price for that interval.
const validateSale = (regular: number, sale: number, label: string): string | null => {
    if (!sale || Number(sale) <= 0) return null; // no sale for this interval
    if (!regular || Number(regular) <= 0) {
        return `Cannot set a ${label} sale price without a ${label} regular price.`;
    }
    if (Number(sale) >= Number(regular)) {
        return `The ${label} sale price must be lower than the regular price.`;
    }
    return null;
};

// Shape a plan document for public consumption (safe to expose — price IDs are used client-side).
const toPublicPlan = (plan: any) => ({
    id: plan._id,
    name: plan.name,
    description: plan.description,
    features: plan.features,
    monthlyPriceId: plan.monthlyPriceId,
    yearlyPriceId: plan.yearlyPriceId,
    monthlyAmount: plan.monthlyAmount,
    yearlyAmount: plan.yearlyAmount,
    saleMonthlyAmount: plan.saleMonthlyAmount,
    saleYearlyAmount: plan.saleYearlyAmount,
    currency: plan.currency,
    trialDays: plan.trialDays,
    highlighted: plan.highlighted,
    badge: plan.badge,
    displayOrder: plan.displayOrder,
});

/**
 * @route   GET /api/plans/public
 * @desc    Active plans for the public pricing screen (no auth)
 */
router.get('/public', async (_req, res) => {
    try {
        const plans = await Plan.find({ active: true }).sort({ displayOrder: 1, createdAt: 1 });
        res.json(plans.map(toPublicPlan));
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @route   GET /api/plans
 * @desc    All plans (admin)
 */
router.get('/', auth, async (_req, res) => {
    try {
        const plans = await Plan.find().sort({ displayOrder: 1, createdAt: 1 });
        res.json(plans);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * Create a recurring Stripe price for a product. Returns the price id, or '' if amount <= 0.
 */
async function createRecurringPrice(
    stripe: Stripe,
    productId: string,
    amount: number,
    currency: string,
    interval: 'month' | 'year',
): Promise<string> {
    if (!amount || amount <= 0) return '';
    const price = await stripe.prices.create({
        product: productId,
        unit_amount: toStripeAmount(amount),
        currency,
        recurring: { interval },
    });
    return price.id;
}

/**
 * @route   POST /api/plans
 * @desc    Create a plan — creates a Stripe Product + monthly/yearly Prices (admin)
 */
router.post('/', auth, async (req, res) => {
    try {
        const {
            name, description = '', features = [],
            monthlyAmount = 0, yearlyAmount = 0,
            saleMonthlyAmount = 0, saleYearlyAmount = 0,
            currency = 'usd', trialDays = 14,
            highlighted = false, badge = '', displayOrder = 0,
        } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Plan name is required' });
        }
        if ((!monthlyAmount || monthlyAmount <= 0) && (!yearlyAmount || yearlyAmount <= 0)) {
            return res.status(400).json({ message: 'At least one of monthly or yearly price is required' });
        }
        const saleError = validateSale(monthlyAmount, saleMonthlyAmount, 'monthly')
            || validateSale(yearlyAmount, saleYearlyAmount, 'yearly');
        if (saleError) {
            return res.status(400).json({ message: saleError });
        }

        const stripe = await getStripe();

        // 1. Create the Stripe product
        const product = await stripe.products.create({
            name,
            description: description || undefined,
        });

        // 2. Create prices for each offered interval (+ sale prices when set)
        const cur = String(currency).toLowerCase();
        const monthlyPriceId = await createRecurringPrice(stripe, product.id, monthlyAmount, cur, 'month');
        const yearlyPriceId = await createRecurringPrice(stripe, product.id, yearlyAmount, cur, 'year');
        const saleMonthlyPriceId = await createRecurringPrice(stripe, product.id, saleMonthlyAmount, cur, 'month');
        const saleYearlyPriceId = await createRecurringPrice(stripe, product.id, saleYearlyAmount, cur, 'year');

        // 3. Persist
        const plan = await Plan.create({
            name, description, features,
            stripeProductId: product.id,
            monthlyPriceId, yearlyPriceId,
            monthlyAmount, yearlyAmount,
            saleMonthlyAmount, saleYearlyAmount,
            saleMonthlyPriceId, saleYearlyPriceId,
            currency: cur, trialDays,
            highlighted, badge, displayOrder,
            active: true,
        });

        res.status(201).json(plan);
    } catch (err: any) {
        console.error('Create plan error:', err);
        res.status(500).json({ message: err.message || 'Failed to create plan' });
    }
});

/**
 * @route   PUT /api/plans/:id
 * @desc    Update a plan. Stripe prices are immutable, so a changed amount
 *          creates a new Price and archives the old one (admin).
 */
router.put('/:id', auth, async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        const {
            name, description, features,
            monthlyAmount, yearlyAmount,
            saleMonthlyAmount, saleYearlyAmount,
            currency, trialDays,
            highlighted, badge, displayOrder, active,
        } = req.body;

        const stripe = await getStripe();
        const cur = (currency ? String(currency).toLowerCase() : plan.currency) as string;

        // Validate sale prices against the effective (new or existing) regular prices
        const effMonthly = monthlyAmount !== undefined ? Number(monthlyAmount) : plan.monthlyAmount;
        const effYearly = yearlyAmount !== undefined ? Number(yearlyAmount) : plan.yearlyAmount;
        const effSaleMonthly = saleMonthlyAmount !== undefined ? Number(saleMonthlyAmount) : plan.saleMonthlyAmount;
        const effSaleYearly = saleYearlyAmount !== undefined ? Number(saleYearlyAmount) : plan.saleYearlyAmount;
        const saleError = validateSale(effMonthly, effSaleMonthly, 'monthly')
            || validateSale(effYearly, effSaleYearly, 'yearly');
        if (saleError) {
            return res.status(400).json({ message: saleError });
        }

        // Update the Stripe product metadata if name/description/active changed
        if (plan.stripeProductId && (name !== undefined || description !== undefined || active !== undefined)) {
            await stripe.products.update(plan.stripeProductId, {
                ...(name !== undefined ? { name } : {}),
                ...(description !== undefined ? { description: description || undefined } : {}),
                ...(active !== undefined ? { active: !!active } : {}),
            });
        }

        // Monthly price changed → create a new price, archive the old
        if (monthlyAmount !== undefined && Number(monthlyAmount) !== plan.monthlyAmount) {
            if (plan.monthlyPriceId) {
                await stripe.prices.update(plan.monthlyPriceId, { active: false }).catch(() => {});
            }
            plan.monthlyPriceId = await createRecurringPrice(stripe, plan.stripeProductId, Number(monthlyAmount), cur, 'month');
            plan.monthlyAmount = Number(monthlyAmount);
        }

        // Yearly price changed → create a new price, archive the old
        if (yearlyAmount !== undefined && Number(yearlyAmount) !== plan.yearlyAmount) {
            if (plan.yearlyPriceId) {
                await stripe.prices.update(plan.yearlyPriceId, { active: false }).catch(() => {});
            }
            plan.yearlyPriceId = await createRecurringPrice(stripe, plan.stripeProductId, Number(yearlyAmount), cur, 'year');
            plan.yearlyAmount = Number(yearlyAmount);
        }

        // Monthly sale price changed → create a new price (or clear), archive the old
        if (saleMonthlyAmount !== undefined && Number(saleMonthlyAmount) !== plan.saleMonthlyAmount) {
            if (plan.saleMonthlyPriceId) {
                await stripe.prices.update(plan.saleMonthlyPriceId, { active: false }).catch(() => {});
            }
            plan.saleMonthlyPriceId = await createRecurringPrice(stripe, plan.stripeProductId, Number(saleMonthlyAmount), cur, 'month');
            plan.saleMonthlyAmount = Number(saleMonthlyAmount);
        }

        // Yearly sale price changed → create a new price (or clear), archive the old
        if (saleYearlyAmount !== undefined && Number(saleYearlyAmount) !== plan.saleYearlyAmount) {
            if (plan.saleYearlyPriceId) {
                await stripe.prices.update(plan.saleYearlyPriceId, { active: false }).catch(() => {});
            }
            plan.saleYearlyPriceId = await createRecurringPrice(stripe, plan.stripeProductId, Number(saleYearlyAmount), cur, 'year');
            plan.saleYearlyAmount = Number(saleYearlyAmount);
        }

        if (name !== undefined) plan.name = name;
        if (description !== undefined) plan.description = description;
        if (features !== undefined) plan.features = features;
        if (currency !== undefined) plan.currency = cur;
        if (trialDays !== undefined) plan.trialDays = trialDays;
        if (highlighted !== undefined) plan.highlighted = highlighted;
        if (badge !== undefined) plan.badge = badge;
        if (displayOrder !== undefined) plan.displayOrder = displayOrder;
        if (active !== undefined) plan.active = active;

        await plan.save();
        res.json(plan);
    } catch (err: any) {
        console.error('Update plan error:', err);
        res.status(500).json({ message: err.message || 'Failed to update plan' });
    }
});

/**
 * @route   DELETE /api/plans/:id
 * @desc    Archive a plan (soft) — deactivate the plan and its Stripe product/prices.
 *          Archiving (not deleting) keeps existing subscriptions on this price valid (admin).
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        const stripe = await getStripe();

        for (const priceId of [plan.monthlyPriceId, plan.yearlyPriceId, plan.saleMonthlyPriceId, plan.saleYearlyPriceId]) {
            if (priceId) {
                await stripe.prices.update(priceId, { active: false }).catch(() => {});
            }
        }
        if (plan.stripeProductId) {
            await stripe.products.update(plan.stripeProductId, { active: false }).catch(() => {});
        }

        plan.active = false;
        await plan.save();

        res.json({ status: 'success', message: 'Plan archived', id: plan._id });
    } catch (err: any) {
        console.error('Archive plan error:', err);
        res.status(500).json({ message: err.message || 'Failed to archive plan' });
    }
});

export default router;
