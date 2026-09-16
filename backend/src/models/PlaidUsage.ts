import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaidUsage extends Document {
    productId: mongoose.Types.ObjectId | null;
    userId: mongoose.Types.ObjectId;
    endpoint: string;
    price: number;
    billing: string;
    status: string;
    timestamp: Date;
    plaidEnv?: 'sandbox' | 'production' | 'unknown';
}

const PlaidUsageSchema: Schema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'PlaidPricing', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true },
    price: { type: Number, required: true },
    billing: { type: String, required: true },
    status: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    // Sandbox calls are free; production calls are billed. Without this, invoices mix
    // the two. Derived from the endpoint host for calls the add-on reports itself.
    plaidEnv: { type: String, enum: ['sandbox', 'production', 'unknown'], default: undefined },
}, { timestamps: true, collection: 'plaid_usage' });

export default mongoose.model<IPlaidUsage>('PlaidUsage', PlaidUsageSchema);
