import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
    name: string;
    description: string;
    features: string[];
    stripeProductId: string;
    // Stripe Price IDs — one per billing interval (either may be empty if that interval isn't offered)
    monthlyPriceId: string;
    yearlyPriceId: string;
    // Amounts in major currency units (e.g. 29 = $29.00) for admin display; converted to cents for Stripe
    monthlyAmount: number;
    yearlyAmount: number;
    // Sale (discounted) prices — 0 means no sale for that interval. When active (0 < sale < regular),
    // the pricing screen shows a strikethrough and checkout charges the sale price via its own Stripe Price.
    saleMonthlyAmount: number;
    saleYearlyAmount: number;
    saleMonthlyPriceId: string;
    saleYearlyPriceId: string;
    currency: string;
    trialDays: number;
    active: boolean;
    highlighted: boolean;
    badge: string;
    displayOrder: number;
}

const PlanSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    features: { type: [String], default: [] },
    stripeProductId: { type: String, default: '' },
    monthlyPriceId: { type: String, default: '' },
    yearlyPriceId: { type: String, default: '' },
    monthlyAmount: { type: Number, default: 0 },
    yearlyAmount: { type: Number, default: 0 },
    saleMonthlyAmount: { type: Number, default: 0 },
    saleYearlyAmount: { type: Number, default: 0 },
    saleMonthlyPriceId: { type: String, default: '' },
    saleYearlyPriceId: { type: String, default: '' },
    currency: { type: String, default: 'usd' },
    trialDays: { type: Number, default: 14 },
    active: { type: Boolean, default: true },
    highlighted: { type: Boolean, default: false },
    badge: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model<IPlan>('Plan', PlanSchema);
