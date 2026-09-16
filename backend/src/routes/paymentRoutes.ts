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
import { auth } from '../middleware/authMiddleware.js';
import { findUserByEmail } from '../utils/userLookup.js';
import { refundSubscription, latestPaymentWithinDays } from '../utils/stripeRefund.js';
import StripeEvent from '../models/StripeEvent.js';
import { removePlaidItemsForAccounts } from '../utils/plaidItems.js';
import { getStripe, STRIPE_API_VERSION } from '../utils/stripeClient.js';
import { resolvePlaidCredentials, isDevUser } from '../utils/envCredentials.js';
import { ensureDevPlanPrices, getDevStripe } from '../utils/devStripePlans.js';
import { reportModeMismatch, subscriptionModeFilter } from '../utils/recordMode.js';

const router = express.Router();

// A payment made within this many days is refunded when the user unsubscribes;
// otherwise the subscription runs to the end of the paid period.
const REFUND_WINDOW_DAYS = 7;

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
            // Marks checkouts started from the add-on, where the email is the verified
            // Google login. Website checkouts can't attach to existing users.
            metadata: { source: 'addon' },
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
        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({ message: 'Session ID is required' });
        }

        // The session belongs to either the live or the test account, and we don't know
        // which until we look it up — try production first, then the dev/test account.
        let session: Stripe.Checkout.Session | null = null;
        let fromDevAccount = false;
        let sessionStripe: Stripe | null = null;
        try {
            const stripe = await getStripe();
            session = await stripe.checkout.sessions.retrieve(sessionId, {
                expand: ['subscription', 'line_items']
            });
            sessionStripe = stripe;
        } catch (prodErr: any) {
            const devStripe = await getDevStripe();
            if (!devStripe) throw prodErr;
            session = await devStripe.checkout.sessions.retrieve(sessionId, {
                expand: ['subscription', 'line_items']
            });
            fromDevAccount = true;
            sessionStripe = devStripe;
        }

        if (!session || !sessionStripe) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const outcome = await applyCheckoutSession(session, fromDevAccount, sessionStripe);
        if (!outcome.ok) {
            return res.status(outcome.status).json({ message: outcome.message });
        }

        res.json({ status: 'success', data: outcome.data });

    } catch (err: any) {
        console.error('Payment verification error:', err);
        res.status(500).json({ message: err.message || 'Payment verification failed' });
    }
});

// Subscription statuses that keep add-on access. past_due keeps access while
// Stripe retries the payment. 'paid' covers rows written by older code, which
// stored the checkout payment_status instead of the subscription's status.
const ACCESS_STATUSES = ['active', 'trialing', 'past_due', 'paid'];

/** A subscription's period end, wherever the Stripe API version in use puts it. */
function periodEndFrom(subscription: any): Date | null {
    const seconds = subscription?.current_period_end ?? subscription?.items?.data?.[0]?.current_period_end;
    return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

type CheckoutOutcome =
    | { ok: true; data: Record<string, unknown> }
    | { ok: false; status: number; message: string };

/**
 * Records a completed subscription checkout: the user, the subscription row, and
 * access.
 *
 * Shared by verify-session (the success page) and the checkout.session.completed
 * webhook, so a buyer who closes the tab is still recorded. Safe to run twice for
 * the same session.
 *
 * Access is granted only for a complete session whose subscription is active or
 * trialing. This used to set isSubscribed = true for any session in any state, and
 * an old session could be replayed after cancelling to regain access for good.
 */
async function applyCheckoutSession(session: Stripe.Checkout.Session, fromDevAccount: boolean, stripe: Stripe): Promise<CheckoutOutcome> {
    if (session.status !== 'complete') {
        return { ok: false, status: 409, message: 'Checkout is not complete yet' };
    }

    const customerEmail = session.customer_details?.email?.toLowerCase();
    if (!customerEmail) {
        return { ok: false, status: 400, message: 'No email found in session' };
    }

    // Reachable unauthenticated and grants a subscription, so a test-mode session
    // must only ever activate a Development Environment account.
    if (fromDevAccount) {
        const settings = await Settings.findOne();
        if (!isDevUser(settings, customerEmail)) {
            console.warn(`Rejected test-mode session ${session.id} for non-dev email ${customerEmail}`);
            return { ok: false, status: 403, message: 'Test-mode session is not permitted for this account' };
        }
    }

    const subscriptionData = session.subscription as Stripe.Subscription | string | null;
    const subscriptionObject: any = (typeof subscriptionData === 'object' && subscriptionData !== null) ? subscriptionData : null;
    const stripeSubId: string | undefined = typeof subscriptionData === 'string' ? subscriptionData : subscriptionObject?.id;
    if (!stripeSubId || !subscriptionObject) {
        return { ok: false, status: 400, message: 'No subscription found in session' };
    }

    // The live status from Stripe, so a canceled subscription can't be revived by
    // replaying its old session.
    const status: string = subscriptionObject.status || '';
    if (status !== 'active' && status !== 'trialing') {
        return { ok: false, status: 402, message: 'This subscription is not active' };
    }

    // Case-insensitive, so a stored "Anna@…" doesn't gain a duplicate lowercase user.
    let user = await findUserByEmail(customerEmail);

    // Website checkouts collect an email the buyer types, which proves nothing about who
    // they are. They may create a NEW user, but never attach to one that already existed:
    // otherwise anyone could tie a subscription, and the data deletion that follows its
    // cancellation, to someone else's account. Add-on checkouts carry the verified Google
    // login: marked with metadata, or, for sessions created before that marker existed,
    // by the customer_email the add-on has always set.
    const fromAddon = session.metadata?.source === 'addon' || !!session.customer_email;
    const userCreatedMs = user ? new Date(user.createdAt).getTime() : NaN;
    // A missing creation date counts as "existed" so the check fails safe.
    const userExistedBeforeCheckout = !!user && (isNaN(userCreatedMs) || userCreatedMs < session.created * 1000);
    if (!fromAddon && userExistedBeforeCheckout) {
        const alreadyLinked = await Subscription.findOne({ stripeSubscriptionId: stripeSubId, userId: user!._id });
        if (!alreadyLinked) {
            try {
                await refundSubscription(stripe, stripeSubId);
                await stripe.subscriptions.cancel(stripeSubId);
            } catch (reverseErr: any) {
                if (reverseErr?.code !== 'resource_missing') {
                    console.error(`Could not reverse website checkout ${session.id}:`, reverseErr?.message);
                }
            }
            console.warn(`Website checkout ${session.id} used an existing account email; cancelled and refunded.`);
            return {
                ok: false,
                status: 409,
                message: 'This email already has a TheFinU account, so this purchase was cancelled and refunded. To subscribe, open TheFinU in Google Sheets and subscribe from there.'
            };
        }
    }

    if (!user) {
        user = new User({ email: customerEmail });
    }

    const lineItem = session.line_items?.data[0]; // Assuming one main item
    const amount = (session.amount_total || 0) / 100; // Stripe amounts are in minor units
    const currency = session.currency || 'usd';
    const planName = lineItem?.description || 'Premium Plan';
    const currentPeriodEnd = periodEndFrom(subscriptionObject) || new Date();
    const trialEnd = typeof subscriptionObject.trial_end === 'number'
        ? new Date(subscriptionObject.trial_end * 1000)
        : null;

    // Save the user first so the subscription row never points at a user that
    // failed to save.
    user.isSubscribed = true;
    user.cancelAtPeriodEnd = false;
    user.currentPeriodEnd = currentPeriodEnd;
    user.trialEnd = trialEnd;
    await user.save();

    await Account.updateMany({ user_id: user._id }, { isSubscribed: true });

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
            // Straight from Stripe: a real payment or a test one. Nothing recorded this
            // before, so a test-mode event could act on a live subscription — and that
            // path deletes the user's data.
            livemode: subscriptionObject.livemode,
        });
    } else {
        subscription.status = status;
        subscription.currentPeriodEnd = currentPeriodEnd;
        subscription.planName = planName; // In case it upgraded
        // Fills the mode in on rows that predate the field.
        if (subscription.livemode === undefined) {
            subscription.livemode = subscriptionObject.livemode;
        }
    }
    await subscription.save();

    return {
        ok: true,
        data: {
            subscriptionId: stripeSubId,
            email: customerEmail,
            amount: amount,
            currency: currency,
            plan: planName,
            customerName: session.customer_details?.name
        }
    };
}

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

        // Case-insensitive: a stored "Anna@…" must still match the lowercased identity.
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Free users keep all data — only cancel Stripe subscription
        if (user.isFreeUser) {
            return res.json({
                status: 'success',
                message: 'Free user — no subscription to cancel. Data retained.',
                // Tells the add-on not to clear the spreadsheet. It used to treat this
                // success like a real cancellation and wipe a free user's data while
                // the backend kept everything.
                dataRetained: true,
            });
        }

        // 1. Cancel each subscription under the refund policy: a payment made within the
        //    last REFUND_WINDOW_DAYS is refunded and the subscription ends now; otherwise
        //    it runs to the end of the paid period with no refund. This used to refund the
        //    full last invoice however long ago it was paid.
        const subscriptions = await Subscription.find({ userId: user._id });
        const stripe = await getStripe(user.email);
        const results: Array<Record<string, unknown>> = [];
        let scheduledEnd: Date | null = null;

        for (const sub of subscriptions) {
            try {
                if (await latestPaymentWithinDays(stripe, sub.stripeSubscriptionId, REFUND_WINDOW_DAYS)) {
                    const refund = await refundSubscription(stripe, sub.stripeSubscriptionId);
                    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
                    results.push({
                        id: sub.stripeSubscriptionId,
                        status: 'canceled',
                        refunded: refund ? `${refund.amount / 100} ${refund.currency}` : 'no payment to refund',
                    });
                } else {
                    await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
                    sub.cancelAtPeriodEnd = true;
                    await sub.save();
                    if (!scheduledEnd || sub.currentPeriodEnd > scheduledEnd) scheduledEnd = sub.currentPeriodEnd;
                    results.push({ id: sub.stripeSubscriptionId, status: 'cancels_at_period_end', periodEnd: sub.currentPeriodEnd });
                }
            } catch (stripeErr: any) {
                if (stripeErr.code === 'resource_missing' || (stripeErr.message && stripeErr.message.includes('No such subscription'))) {
                    results.push({ id: sub.stripeSubscriptionId, status: 'canceled (already missing in Stripe)' });
                } else {
                    console.error(`Error canceling sub ${sub.stripeSubscriptionId}:`, stripeErr);
                    results.push({ id: sub.stripeSubscriptionId, error: stripeErr.message });
                }
            }
        }

        // If Stripe refused any cancellation, delete nothing. The user can retry; this
        // used to carry on and delete all their data with a subscription still active.
        if (results.some((r) => r.error)) {
            return res.status(502).json({
                message: 'Your subscription could not be cancelled right now, so nothing was changed. Please try again.',
                results,
            });
        }

        // Anything running to the end of its period keeps the user's data until then;
        // the "subscription deleted" webhook clears it when the period is over.
        if (scheduledEnd) {
            user.cancelAtPeriodEnd = true;
            await user.save();
            return res.json({
                status: 'success',
                scheduled: true,
                dataRetained: true,
                periodEnd: scheduledEnd,
                message: `Your subscription will end on ${scheduledEnd.toDateString()}. No refund is due because your last payment was more than ${REFUND_WINDOW_DAYS} days ago. Your data stays until then.`,
                results,
            });
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

        // Accounts whose Plaid Item couldn't be removed are kept (status false), so the
        // access token isn't lost while the Item is still billed.
        const { removableAccountIds } = await removePlaidItemsForAccounts(accounts, user.email);

        // 4. Delete accounts
        await Account.deleteMany({ _id: { $in: removableAccountIds } });

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
        const signingCandidates: Array<{ secretKey: string; webhookSecret: string; isDev: boolean }> = [
            { secretKey: settings.stripeSecretKey, webhookSecret: settings.stripeWebhookSecret, isDev: false },
        ];
        if (settings.devEnabled && settings.devStripeSecretKey && settings.devStripeWebhookSecret) {
            signingCandidates.push({
                secretKey: settings.devStripeSecretKey,
                webhookSecret: settings.devStripeWebhookSecret,
                isDev: true,
            });
        }

        const verifiable = signingCandidates.filter((c) => c.webhookSecret);

        // Fail closed. With no secret configured this used to parse the body
        // unverified, so anyone could post a fake "subscription deleted" event and
        // delete a user's data. Stripe retries rejected deliveries for several days,
        // so no event is lost while the secret is being configured.
        if (verifiable.length === 0) {
            console.error('Stripe webhook rejected: no webhook signing secret is configured');
            return res.status(500).json({ message: 'Webhook signing secret is not configured' });
        }

        const sig = req.headers['stripe-signature'] as string;
        let event: Stripe.Event | null = null;
        let verifiedWith: { secretKey: string; isDev: boolean } | null = null;
        for (const candidate of verifiable) {
            try {
                const stripe = new Stripe(candidate.secretKey, {
                    apiVersion: STRIPE_API_VERSION as any,
                });
                event = stripe.webhooks.constructEvent(req.body, sig, candidate.webhookSecret);
                verifiedWith = candidate;
                break;
            } catch {
                // Signature did not match this account — try the next one.
            }
        }

        if (!event || !verifiedWith) {
            console.error('Webhook signature verification failed for all configured accounts');
            return res.status(400).json({ message: 'Webhook signature verification failed' });
        }

        // Stripe can deliver an event more than once. Skip ones already processed; they
        // are recorded only after processing succeeds, so a failure is still retried.
        if (await StripeEvent.exists({ eventId: event.id })) {
            return res.json({ received: true, duplicate: true });
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                // Records the subscription even when the buyer never reaches the
                // success page. verify-session used to be the only writer, so a
                // closed tab meant Stripe billed someone the database didn't know.
                const eventSession = event.data.object as Stripe.Checkout.Session;
                if (eventSession.mode === 'subscription') {
                    const stripe = new Stripe(verifiedWith.secretKey, {
                        apiVersion: STRIPE_API_VERSION as any,
                    });
                    const session = await stripe.checkout.sessions.retrieve(eventSession.id, {
                        expand: ['subscription', 'line_items']
                    });
                    const outcome = await applyCheckoutSession(session, verifiedWith.isDev, stripe);
                    if (!outcome.ok) {
                        console.warn(`Webhook: checkout ${eventSession.id} not applied — ${outcome.message}`);
                    }
                }
                break;
            }
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

        await StripeEvent.create({ eventId: event.id, type: event.type, livemode: event.livemode })
            .catch(() => { /* recorded concurrently */ });
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

    // This handler deletes the user's data, so a test event reaching a live
    // subscription is the worst case of the two modes mixing. Once mode checks are on,
    // such an event is ignored rather than acted on.
    const modeMismatch = reportModeMismatch(
        'Subscription',
        stripeSubscription.id,
        sub.livemode === undefined ? undefined : (sub.livemode ? 'live' : 'test'),
        stripeSubscription.livemode ? 'live' : 'test'
    );
    if (modeMismatch) {
        console.warn(`Webhook: ignoring cancellation for ${stripeSubscription.id} — wrong mode.`);
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

    // Accounts whose Plaid Item couldn't be removed are kept (status false), so the
    // access token isn't lost while the Item is still billed.
    const { removableAccountIds } = await removePlaidItemsForAccounts(accounts, user.email);

    // Delete accounts, spreadsheets, and user
    await Account.deleteMany({ _id: { $in: removableAccountIds } });
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

    // A test-mode update must not change a live subscription's status or period.
    const modeMismatch = reportModeMismatch(
        'Subscription',
        stripeSubscription.id,
        sub.livemode === undefined ? undefined : (sub.livemode ? 'live' : 'test'),
        stripeSubscription.livemode ? 'live' : 'test'
    );
    if (modeMismatch) {
        console.warn(`Webhook: ignoring update for ${stripeSubscription.id} — wrong mode.`);
        return;
    }

    sub.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    sub.status = stripeSubscription.status;
    // Read defensively: newer Stripe API versions moved current_period_end onto the
    // subscription items, and an Invalid Date here failed the save and made Stripe
    // retry the event indefinitely.
    const periodEnd = periodEndFrom(stripeSubscription);
    if (periodEnd) sub.currentPeriodEnd = periodEnd;
    const trialEndSeconds = (stripeSubscription as any).trial_end;
    sub.trialEnd = typeof trialEndSeconds === 'number' ? new Date(trialEndSeconds * 1000) : null;
    await sub.save();

    const user = await User.findById(sub.userId);
    if (!user) return;

    user.currentPeriodEnd = sub.currentPeriodEnd;
    user.cancelAtPeriodEnd = sub.cancelAtPeriodEnd;
    user.trialEnd = sub.trialEnd;

    // Access follows Stripe's status. Nothing used to set isSubscribed back to
    // false, so a declined card or an unpaid subscription kept full access for
    // good. Counted across all of the user's subscriptions, so one lapsed duplicate
    // can't remove access granted by another. Free users are never downgraded.
    if (!user.isFreeUser) {
        const withAccess = await Subscription.countDocuments({
            userId: user._id,
            status: { $in: ACCESS_STATUSES },
        });
        user.isSubscribed = withAccess > 0;
    }
    await user.save();
}

/**
 * @route   POST /api/payment/extend-trial
 * @desc    Extend trial period for a subscription (Admin)
 *          Can be used to give free days/months by setting a future trial_end on Stripe
 *          Admin-only — previously unauthenticated, so anyone could grant free months.
 */
router.post('/extend-trial', auth, async (req, res) => {
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
 * @desc    Get all subscriptions (Admin). Admin-only — previously unauthenticated.
 */
router.get('/subscriptions', auth, async (req, res) => {
    try {
        // ?mode=test lists test-mode subscriptions; anything else lists live ones. The
        // filter does nothing until mode checks are on.
        const subscriptions = await Subscription.find(subscriptionModeFilter(req.query.mode))
            .populate('userId', 'email')
            .sort({ createdAt: -1 });
        res.json(subscriptions);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
