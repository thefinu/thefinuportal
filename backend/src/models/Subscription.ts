import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    planName: string;
    amount: number;
    currency: string;
    status: string;
    currentPeriodEnd: Date;
    paymentEmail: string;
    cancelAtPeriodEnd: boolean;
    trialEnd: Date | null;
    livemode?: boolean;
}

const SubscriptionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stripeSubscriptionId: { type: String, required: true },
    stripeCustomerId: { type: String, required: true },
    planName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, required: true },
    currentPeriodEnd: { type: Date, required: true },
    paymentEmail: { type: String, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    trialEnd: { type: Date, default: null },

    // Whether this came from live Stripe or test Stripe, copied from the Stripe object
    // itself. A test-mode cancellation used to be able to act on a live subscription,
    // which deletes the user's data. Rows written before this field exists stay unset
    // and count as live — see utils/recordMode.
    livemode: { type: Boolean, default: undefined },
}, { timestamps: true });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
