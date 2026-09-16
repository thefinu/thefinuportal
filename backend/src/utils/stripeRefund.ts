import type Stripe from 'stripe';

/**
 * True when the subscription's latest paid invoice was paid within the last `days`
 * days and was for a non-zero amount. Drives the refund window on unsubscribe.
 * Stripe errors propagate, so a failed lookup never counts as "outside the window".
 */
export async function latestPaymentWithinDays(stripe: Stripe, subscriptionId: string, days: number): Promise<boolean> {
    const invoices = await stripe.invoices.list({ subscription: subscriptionId, status: 'paid', limit: 1 });
    const invoice = invoices.data[0] as any;
    if (!invoice || !invoice.amount_paid) return false;
    const paidAt = invoice.status_transitions?.paid_at || invoice.created;
    if (typeof paidAt !== 'number') return false;
    return (Date.now() / 1000 - paidAt) <= days * 24 * 60 * 60;
}

/**
 * Refund the latest invoice payment for a Stripe subscription.
 * Returns the refund object or null if no refundable payment found.
 */
export async function refundSubscription(stripe: Stripe, subscriptionId: string): Promise<Stripe.Refund | null> {
    try {
        // Get the latest invoice for this subscription
        const invoices = await stripe.invoices.list({
            subscription: subscriptionId,
            limit: 1,
        });

        const latestInvoice = invoices.data[0] as any;
        if (!latestInvoice || !latestInvoice.payment_intent) {
            console.log(`No refundable invoice found for subscription ${subscriptionId}`);
            return null;
        }

        const paymentIntentId = typeof latestInvoice.payment_intent === 'string'
            ? latestInvoice.payment_intent
            : latestInvoice.payment_intent.id;

        // Issue a full refund on the payment intent
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
        });

        console.log(`Refunded ${refund.amount / 100} ${refund.currency} for subscription ${subscriptionId} (refund: ${refund.id})`);
        return refund;
    } catch (err: any) {
        // Skip if already refunded or charge not refundable
        if (err.code === 'charge_already_refunded') {
            console.log(`Subscription ${subscriptionId} was already refunded`);
            return null;
        }
        console.error(`Refund failed for subscription ${subscriptionId}:`, err.message);
        return null;
    }
}
