import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaidPricing extends Document {
    product: string;
    rate: number;
    perCall: boolean;
    perMonth: boolean;
}

const PlaidPricingSchema: Schema = new Schema({
    product: { type: String, required: true },
    rate: { type: Number, required: true },
    perCall: { type: Boolean, default: false },
    perMonth: { type: Boolean, default: false },
}, { timestamps: true, collection: 'plaid_pricing' });

export default mongoose.model<IPlaidPricing>('PlaidPricing', PlaidPricingSchema);
