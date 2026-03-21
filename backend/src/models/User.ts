import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    isSubscribed: boolean;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    isSubscribed: { type: Boolean, default: false },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    trialEnd: { type: Date, default: null },
}, { timestamps: true, collection: 'users' });

export default mongoose.model<IUser>('User', UserSchema);
