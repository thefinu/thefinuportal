import express from 'express';
import Stripe from 'stripe';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import UserSpreadsheet from '../models/UserSpreadsheet.js';
import Plan from '../models/Plan.js';
import { gasAuth, type GasAuthRequest } from '../middleware/gasAuthMiddleware.js';
import { refundSubscription } from '../utils/stripeRefund.js';
import { getStripe, STRIPE_API_VERSION } from '../utils/stripeClient.js';
import { resolvePlaidCredentials, isDevUser } from '../utils/envCredentials.js';
import { ensureDevPlanPrices, getDevStripe } from '../utils/devStripePlans.js';

const router = express.Router();

/**
 * Resolve the Stripe Price ID to charge from a plan + interval selection.
 *
 * When `isDev` is true the price is resolved from the plan's TEST-account mirror
 * (created lazily), because live-mode price IDs cannot be charged with a test key.
 *
 * Returns the price id and the plan's trial days.
 */
async function resolvePrice(
    planId: string | undefined,
    interval: string | undefined,
    isDev = false,
): Promise<{ priceId: string; trialDays: number | null }> {
    if (!planId) {
        throw new Error('A plan must be selected for checkout');
    }
    const plan = await Plan.findById(planId);
    if (!plan || !plan.active) {
        throw new Error('Selected plan is not available');
    }
    const isYearly = interval === 'yearly';
    const regularAmount = isYearly ? plan.yearlyAmount : plan.monthlyAmount;
    const saleAmount = isYearly ? plan.saleYearlyAmount : plan.saleMonthlyAmount;

    // Charge the sale price when a valid sale is active for this interval
    const onSale = saleAmount > 0 && saleAmount < regularAmount;

    let priceId: string;
    if (isDev) {
        // Make sure this plan exists in the TEST account, then use those price IDs
        await ensureDevPlanPrices(plan);
        priceId = onSale
            ? (isYearly ? plan.devSaleYearlyPriceId : plan.devSaleMonthlyPriceId)
            : (isYearly ? plan.devYearlyPriceId : plan.devMonthlyPriceId);
    } else {
        const regularPriceId = isYearly ? plan.yearlyPriceId : plan.monthlyPriceId;
        const salePriceId = isYearly ? plan.saleYearlyPriceId : plan.saleMonthlyPriceId;
        priceId = onSale && salePriceId ? salePriceId : regularPriceId;
    }

    if (!priceId) {
        throw new Error(`This plan does not offer ${isYearly ? 'yearly' : 'monthly'} billing`);
    }
    return { priceId, trialDays: plan.trialDays };
}

/**
 * @route   POST /api/payment/create-checkout-session
 * @desc    Create a Stripe checkout session server-side (called from GAS client)
 */
router.post('/create-checkout-session', gasAuth, async (req: GasAuthRequest, res) => {
    try {
        const { spreadsheetId, planId, interval } = req.body;

        // Always use the OAuth-verified identity — never an email from the request
        // body. A caller could otherwise pass a Development Environment address to
        // obtain a free test-mode checkout.
        const userEmail = req.gasUser?.email;

        if (!userEmail) {
            return res.status(401).json({ message: 'Authenticated user email is required' });
        }

        const settings = await Settings.findOne();
        if (!settings) {
            return res.status(500).json({ message: 'Stripe is not configured' });
        }

        // Dev-allowlisted users check out against the TEST Stripe account
        const dev = isDevUser(settings, userEmail);
        const stripe = await getStripe(userEmail);

        // Resolve which price to charge from the selected plan + interval
        const { priceId, trialDays: planTrialDays } = await resolvePrice(planId, interval, dev);

        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        const trialDays = planTrialDays ?? 14;

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            mode: 'subscription',
            customer_email: userEmail,
            success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&spreadsheet_id=${encodeURIComponent(spreadsheetId || '')}`,
            cancel_url: `${baseUrl}/cancel?spreadsheet_id=${encodeURIComponent(spreadsheetId || '')}`,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
        };

        // Only add trial if days > 0
        if (trialDays > 0) {
            sessionParams.subscription_data = {
                trial_period_days: trialDays,
            };
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        res.json({ url: session.url });
    } catch (err: any) {
        console.error('Create checkout session error:', err);
        res.status(500).json({ message: err.message || 'Failed to create checkout session' });
    }
});

/**
 * @route   POST /api/payment/create-website-checkout
 * @desc    Create a Stripe checkout session initiated from the public website
 *          pricing screen. Stripe collects the customer email. (No auth)
 */
router.post('/create-website-checkout', async (req, res) => {
    try {
        const { planId, interval } = req.body;

        if (!planId) {
            return res.status(400).json({ message: 'planId is required' });
        }

        const settings = await Settings.findOne();
        if (!settings || !settings.stripeSecretKey) {
            return res.status(500).json({ message: 'Stripe is not configured' });
        }

        const stripe = await getStripe();

        const { priceId, trialDays: planTrialDays } = await resolvePrice(planId, interval);

        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        const trialDays = planTrialDays ?? 14;

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            mode: 'subscription',
            success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/cancel`,
            line_items: [{ price: priceId, quantity: 1 }],
        };

        if (trialDays > 0) {
            sessionParams.subscription_data = { trial_period_days: trialDays };
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        res.json({ url: session.url });
    } catch (err: any) {
        console.error('Create website checkout error:', err);
        res.status(500).json({ message: err.message || 'Failed to create checkout session' });
    }
});

/**
 * @route   POST /api/payment/verify-session
 * @desc    Verify Stripe session and create subscription
 */
router.post('/verify-session', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID is required' });
        }

        // The session belongs to either the live or the test account, and we don't know
        // which until we look it up — try production first, then the dev/test account.
        let session: Stripe.Checkout.Session | null = null;
        let fromDevAccount = false;
        try {
            const stripe = await getStripe();
            session = await stripe.checkout.sessions.retrieve(sessionId, {
                expand: ['subscription', 'line_items']
            });
        } catch (prodErr: any) {
            const devStripe = await getDevStripe();
            if (!devStripe) throw prodErr;
            session = await devStripe.checkout.sessions.retrieve(sessionId, {
                expand: ['subscription', 'line_items']
            });
            fromDevAccount = true;
        }

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const customerEmail = session.customer_details?.email?.toLowerCase();

        if (!customerEmail) {
            return res.status(400).json({ message: 'No email found in session' });
        }

        // This endpoint is unauthenticated and grants a subscription, so a test-mode
        // session must only ever activate a Development Environment account.
        if (fromDevAccount) {
            const settings = await Settings.findOne();
            if (!isDevUser(settings, customerEmail)) {
                console.warn(`Rejected test-mode session ${sessionId} for non-dev email ${customerEmail}`);
                return res.status(403).json({ message: 'Test-mode session is not permitted for this account' });
            }
        }

        // Find or Update User
        // We match by email as requested
        let user = await User.findOne({ email: customerEmail });

        if (!user) {
            // If user doesn't exist, we could create them, strictly speaking the prompt says "match with email address".
            // If the user isn't in our DB, we can create a skeleton user.
            user = new User({
                email: customerEmail,
                isSubscribed: true,
                cancelAtPeriodEnd: false,
            });
        } else {
            user.isSubscribed = true;
            user.cancelAtPeriodEnd = false;
        }

        // Update all accounts for this user to be subscribed
        await Account.updateMany({ user_id: user._id }, { isSubscribed: true });

        // Extract Subscription Details
        const subscriptionData = session.subscription as Stripe.Subscription;
        const lineItem = session.line_items?.data[0]; // Assuming one main item

        // Amount is usually in cents for Stripe, convert to major unit if needed or keep as is.
        // User asked for "Amount", let's store what we see (e.g. 2900 for $29.00) or normalize.
        // Typically best to store as is or cents. Let's use the amount_total from session which is convenient.
        const amountTotal = session.amount_total || 0;
        const amount = amountTotal / 100; // Convert to dollars/euro for display
        const currency = session.currency || 'usd';

        const planName = lineItem?.description || 'Premium Plan';

        // Upsert Subscription
        // If we already have this subscription ID, update it.
        const stripeSubId = typeof subscriptionData === 'string' ? subscriptionData : subscriptionData?.id;
        const currentPeriodEnd = (typeof subscriptionData === 'object' && subscriptionData !== null && 'current_period_end' in subscriptionData)
            ? new Date((subscriptionData as any).current_period_end * 1000)
            : new Date();
        const status = (typeof subscriptionData === 'object' && subscriptionData !== null && 'status' in subscriptionData)
            ? (subscriptionData as any).status
            : session.payment_status;

        const trialEnd = (typeof subscriptionData === 'object' && subscriptionData !== null && (subscriptionData as any).trial_end)
            ? new Date((subscriptionData as any).trial_end * 1000)
            : null;

        let subscription = await Subscription.findOne({ stripeSubscriptionId: stripeSubId });

        if (!subscription) {
            subscription = new Subscription({
                userId: user._id,
                stripeSubscriptionId: stripeSubId,
                stripeCustomerId: session.customer as string,
                planName: planName,
                amount: amount,
                currency: currency,
                status: status,
                currentPeriodEnd: currentPeriodEnd,
                paymentEmail: customerEmail,
                trialEnd: trialEnd,
            });
        } else {
            subscription.status = status;
            subscription.currentPeriodEnd = currentPeriodEnd;
            subscription.planName = planName; // In case it upgraded
        }

        await subscription.save();

        // Update user with subscription period info
        user.currentPeriodEnd = currentPeriodEnd;
        user.trialEnd = trialEnd;
        await user.save();

        res.json({
            status: 'success',
            data: {
                subscriptionId: stripeSubId,
                email: customerEmail,
                amount: amount,
                currency: currency,
                plan: planName,
                customerName: session.customer_details?.name
            }
        });

    } catch (err: any) {
        console.error('Payment verification error:', err);
        res.status(500).json({ message: err.message || 'Payment verification failed' });
    }
});

/**
 * @route   POST /api/payment/unsubscribe
 * @desc    Refund, cancel subscription, and delete all user data (unless free user)
 */
router.post('/unsubscribe', gasAuth, async (req: GasAuthRequest, res) => {
    try {
        // This refunds, cancels and deletes user data, so it must only ever act on
        // the OAuth-verified caller — never an email supplied in the request body.
        const email = req.gasUser?.email;

        if (!email) {
            return res.status(401).json({ message: 'Authenticated user email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Free users keep all data — only cancel Stripe subscription
        if (user.isFreeUser) {
            return res.json({
                status: 'success',
                message: 'Free user — no subscription to cancel. Data retained.',
            });
        }

        // 1. Refund and cancel all Stripe subscriptions
        const subscriptions = await Subscription.find({ userId: user._id });
        const stripe = await getStripe(user.email);
        const results: Array<Record<string, unknown>> = [];

        for (const sub of subscriptions) {
            try {
                const refund = await refundSubscription(stripe, sub.stripeSubscriptionId);
                await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
                results.push({
                    id: sub.stripeSubscriptionId,
                    status: 'canceled',
                    refunded: refund ? `${refund.amount / 100} ${refund.currency}` : 'no payment to refund',
                });
            } catch (stripeErr: any) {
                if (stripeErr.code === 'resource_missing' || (stripeErr.message && stripeErr.message.includes('No such subscription'))) {
                    results.push({ id: sub.stripeSubscriptionId, status: 'canceled (already missing in Stripe)' });
                } else {
                    console.error(`Error canceling sub ${sub.stripeSubscriptionId}:`, stripeErr);
                    results.push({ id: sub.stripeSubscriptionId, error: stripeErr.message });
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

        // 2. Delete subscriptions from DB
        await Subscription.deleteMany({ userId: user._id });

        // 3. Remove Plaid items and delete accounts + transactions
        const accounts = await Account.find({ user_id: user._id });
        const accountIds = accounts.map(a => a._id);

        if (accountIds.length > 0) {
            await Transaction.deleteMany({ accountId: { $in: accountIds } });
        }

        if (accounts.length > 0) {
            try {
                const settings = await Settings.findOne();
                const plaid = settings ? resolvePlaidCredentials(settings, user.email) : null;
                if (plaid?.clientKey && plaid?.secretKey) {
                    const plaidBaseUrl = plaid.baseUrl;

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
                                console.error(`Plaid item/remove failed: ${err?.error_message}`);
                            }
                        } catch (plaidErr: any) {
                            console.error('Plaid item/remove error:', plaidErr.message);
                        }
                    }
                }
            } catch (err) {
                console.error('Plaid cleanup error during unsubscribe:', err);
            }
        }

        // 4. Delete accounts
        await Account.deleteMany({ user_id: user._id });

        // 5. Delete spreadsheet records
        await UserSpreadsheet.deleteMany({ userId: user._id });

        // 6. Delete the user
        await User.findByIdAndDelete(user._id);

        res.json({
            status: 'success',
            message: 'Subscription canceled, refunded, and all user data deleted',
            results: results,
            deleted: {
                subscriptions: subscriptions.length,
                accounts: accounts.length,
                transactions: accountIds.length > 0 ? 'cleared' : 'none',
            }
        });

    } catch (err: any) {
        console.error('Unsubscription error:', err);
        res.status(500).json({ message: err.message || 'Unsubscription failed' });
    }
});

/**
 * @route   POST /api/payment/stripe-webhook
 * @desc    Handle Stripe webhook events (subscription deleted, updated, etc.)
 *          NOTE: This route must receive the raw body for signature verification.
 *          In index.ts, mount this route BEFORE express.json() or use express.raw() for this path.
 */
router.post('/stripe-webhook', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings || !settings.stripeSecretKey) {
            return res.status(500).json({ message: 'Stripe is not configured' });
        }

        // Events can originate from either the live account or, for Development
        // Environment users, the test account. Each account signs with its own
        // secret, so try every configured secret until one verifies.
        const signingCandidates: Array<{ secretKey: string; webhookSecret: string }> = [
            { secretKey: settings.stripeSecretKey, webhookSecret: settings.stripeWebhookSecret },
        ];
        if (settings.devEnabled && settings.devStripeSecretKey && settings.devStripeWebhookSecret) {
            signingCandidates.push({
                secretKey: settings.devStripeSecretKey,
                webhookSecret: settings.devStripeWebhookSecret,
            });
        }

        const verifiable = signingCandidates.filter((c) => c.webhookSecret);
        let event: Stripe.Event | null = null;

        if (verifiable.length > 0) {
            const sig = req.headers['stripe-signature'] as string;
            for (const candidate of verifiable) {
                try {
                    const stripe = new Stripe(candidate.secretKey, {
                        apiVersion: STRIPE_API_VERSION as any,
                    });
                    event = stripe.webhooks.constructEvent(req.body, sig, candidate.webhookSecret);
                    break;
                } catch {
                    // Signature did not match this account — try the next one.
                }
            }

            if (!event) {
                console.error('Webhook signature verification failed for all configured accounts');
                return res.status(400).json({ message: 'Webhook signature verification failed' });
            }
        } else {
            // No webhook secret configured — parse body directly (not recommended for production)
            console.warn('Stripe webhook received without a configured signing secret — skipping verification');
            event = req.body as Stripe.Event;
        }

        switch (event.type) {
            case 'customer.subscription.deleted': {
                // Fired when subscription is actually canceled (end of period or immediate)
                const stripeSubscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionCanceled(stripeSubscription);
                break;
            }
            case 'customer.subscription.updated': {
                // Sync cancel_at_period_end changes and status updates
                const stripeSubscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(stripeSubscription);
                break;
            }
            default:
                // Unhandled event type
                break;
        }

        res.json({ received: true });
    } catch (err: any) {
        console.error('Webhook error:', err);
        res.status(500).json({ message: err.message || 'Webhook processing failed' });
    }
});

/**
 * Handle subscription canceled — delete all user data (skip for free users)
 */
async function handleSubscriptionCanceled(stripeSubscription: Stripe.Subscription) {
    const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSubscription.id });
    if (!sub) {
        console.log(`Webhook: No local subscription found for ${stripeSubscription.id}`);
        return;
    }

    sub.status = 'canceled';
    sub.cancelAtPeriodEnd = false;
    await sub.save();

    // Check if user has any remaining active subscriptions
    const activeSubCount = await Subscription.countDocuments({
        userId: sub.userId,
        status: { $nin: ['canceled', 'cancelled'] },
    });

    if (activeSubCount > 0) {
        return; // User still has active subscriptions
    }

    const user = await User.findById(sub.userId);
    if (!user) {
        console.log(`Webhook: User ${sub.userId} not found`);
        return;
    }

    // Free users keep all data — no changes needed
    if (user.isFreeUser) {
        console.log(`Webhook: User ${user.email} is a free user, skipping data deletion`);
        return;
    }

    // Delete subscriptions from DB
    await Subscription.deleteMany({ userId: user._id });

    // Remove Plaid items and delete accounts + transactions
    const accounts = await Account.find({ user_id: user._id });
    const accountIds = accounts.map(a => a._id);

    if (accountIds.length > 0) {
        await Transaction.deleteMany({ accountId: { $in: accountIds } });
    }

    if (accounts.length > 0) {
        try {
            const settings = await Settings.findOne();
            const plaid = settings ? resolvePlaidCredentials(settings, user.email) : null;
            if (plaid?.clientKey && plaid?.secretKey) {
                const plaidBaseUrl = plaid.baseUrl;

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
                            console.error(`Plaid item/remove failed: ${err?.error_message}`);
                        }
                    } catch (plaidErr: any) {
                        console.error('Plaid item/remove error:', plaidErr.message);
                    }
                }
            }
        } catch (err) {
            console.error('Plaid cleanup error during webhook cancellation:', err);
        }
    }

    // Delete accounts, spreadsheets, and user
    await Account.deleteMany({ user_id: user._id });
    await UserSpreadsheet.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    console.log(`Webhook: Deleted all data for user ${user.email} after subscription ended`);
}

/**
 * Handle subscription updated — sync cancel_at_period_end and status
 */
async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSubscription.id });
    if (!sub) return;

    sub.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    sub.status = stripeSubscription.status;
    sub.currentPeriodEnd = new Date((stripeSubscription as any).current_period_end * 1000);
    sub.trialEnd = (stripeSubscription as any).trial_end
        ? new Date((stripeSubscription as any).trial_end * 1000)
        : null;
    await sub.save();

    // Sync to user
    await User.findByIdAndUpdate(sub.userId, {
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        trialEnd: sub.trialEnd,
    });
}

/**
 * @route   POST /api/payment/extend-trial
 * @desc    Extend trial period for a subscription (Admin)
 *          Can be used to give free days/months by setting a future trial_end on Stripe
 */
router.post('/extend-trial', async (req, res) => {
    try {
        const { subscriptionId, days } = req.body;

        if (!subscriptionId) {
            return res.status(400).json({ message: 'subscriptionId is required' });
        }
        if (!days || days < 1) {
            return res.status(400).json({ message: 'days must be a positive number' });
        }

        const sub = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
        if (!sub) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        // Resolve against the subscriber's environment (dev users live in the test account)
        const stripe = await getStripe(sub.paymentEmail);

        // Calculate new trial_end: from now + days, or from existing trial_end + days
        const now = Math.floor(Date.now() / 1000);
        const existingTrialEnd = sub.trialEnd ? Math.floor(sub.trialEnd.getTime() / 1000) : 0;
        const baseTimestamp = existingTrialEnd > now ? existingTrialEnd : now;
        const newTrialEnd = baseTimestamp + (days * 24 * 60 * 60);

        // Update subscription on Stripe — this extends the trial and delays billing
        await stripe.subscriptions.update(subscriptionId, {
            trial_end: newTrialEnd,
            proration_behavior: 'none',
        });

        // Update local records
        const trialEndDate = new Date(newTrialEnd * 1000);
        sub.trialEnd = trialEndDate;
        sub.status = 'trialing';
        await sub.save();

        await User.findByIdAndUpdate(sub.userId, {
            trialEnd: trialEndDate,
            isSubscribed: true,
        });

        res.json({
            status: 'success',
            message: `Trial extended by ${days} days`,
            trialEnd: trialEndDate.toISOString(),
            subscriptionId,
        });
    } catch (err: any) {
        console.error('Extend trial error:', err);
        res.status(500).json({ message: err.message || 'Failed to extend trial' });
    }
});

/**
 * @route   GET /api/payment/subscriptions
 * @desc    Get all subscriptions (Admin)
 */
router.get('/subscriptions', async (req, res) => {
    try {
        const subscriptions = await Subscription.find().populate('userId', 'email').sort({ createdAt: -1 });
        res.json(subscriptions);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
