import mongoose, { Schema, Document } from 'mongoose';

export interface IStripeEvent extends Document {
    eventId: string;
    type: string;
    livemode: boolean;
}

const StripeEventSchema: Schema = new Schema({
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    livemode: { type: Boolean, required: true },
}, { timestamps: true });

export default mongoose.model<IStripeEvent>('StripeEvent', StripeEventSchema);
