import Stripe from 'stripe';
import Settings from '../models/Settings.js';
import type { IPlan } from '../models/Plan.js';
import { STRIPE_API_VERSION } from './stripeClient.js';

/**
 * Stripe keeps test-mode and live-mode objects in completely separate spaces, so a
 * price created with the production key cannot be charged with the test key.
 *
 * Development Environment users therefore need their own mirrored Product/Prices in
 * the TEST account. These are created lazily on first use and cached on the Plan
 * document; planRoutes clears them whenever an amount changes so they get rebuilt.
 */

/** Stripe client for the TEST account, or null when the dev environment isn't configured. */
export async function getDevStripe(): Promise<Stripe | null> {
    const settings = await Settings.findOne();
    if (!settings?.devEnabled || !settings.devStripeSecretKey) return null;
    return new Stripe(settings.devStripeSecretKey, {
        apiVersion: STRIPE_API_VERSION as any,
    });
}

const toStripeAmount = (amount: number): number => Math.round(Number(amount) * 100);

/**
 * Ensure this plan has a mirrored Product + Prices in the TEST Stripe account.
 * Only creates what's missing; persists any newly created IDs onto the plan.
 */
export async function ensureDevPlanPrices(plan: IPlan): Promise<void> {
    const stripe = await getDevStripe();
    if (!stripe) {
        throw new Error('Development Environment Stripe is not configured — add a test secret key in Settings → Development Environment');
    }

    let changed = false;

    // 1. Product
    if (!plan.devStripeProductId) {
        const productParams: Stripe.ProductCreateParams = { name: plan.name };
        if (plan.description) productParams.description = plan.description;
        const product = await stripe.products.create(productParams);
        plan.devStripeProductId = product.id;
        changed = true;
    }

    const createPrice = async (amount: number, interval: 'month' | 'year'): Promise<string> => {
        if (!amount || amount <= 0) return '';
        const price = await stripe.prices.create({
            product: plan.devStripeProductId,
            unit_amount: toStripeAmount(amount),
            currency: plan.currency || 'usd',
            recurring: { interval },
        });
        return price.id;
    };

    // 2. Regular prices
    if (plan.monthlyAmount > 0 && !plan.devMonthlyPriceId) {
        plan.devMonthlyPriceId = await createPrice(plan.monthlyAmount, 'month');
        changed = true;
    }
    if (plan.yearlyAmount > 0 && !plan.devYearlyPriceId) {
        plan.devYearlyPriceId = await createPrice(plan.yearlyAmount, 'year');
        changed = true;
    }

    // 3. Sale prices
    if (plan.saleMonthlyAmount > 0 && !plan.devSaleMonthlyPriceId) {
        plan.devSaleMonthlyPriceId = await createPrice(plan.saleMonthlyAmount, 'month');
        changed = true;
    }
    if (plan.saleYearlyAmount > 0 && !plan.devSaleYearlyPriceId) {
        plan.devSaleYearlyPriceId = await createPrice(plan.saleYearlyAmount, 'year');
        changed = true;
    }

    if (changed) {
        await plan.save();
    }
}
