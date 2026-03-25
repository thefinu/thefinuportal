import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
    plaidClientKey: string;
    plaidSecretKey: string;
    plaidEnvironment: 'sandbox' | 'production';
    spreadsheetTemplateUrl: string;
    appInstruction: string;
    notificationEmail: string;
    appEmail: string;
    stripePublicKey: string;
    stripeSecretKey: string;
    stripePaymentMode: 'sandbox' | 'production';
    stripeWebhookSecret: string;
    plaidWebhookUrl: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    contactEmail: string;
}

const SettingsSchema: Schema = new Schema({
    plaidClientKey: { type: String, default: '' },
    plaidSecretKey: { type: String, default: '' },
    plaidEnvironment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
    plaidWebhookUrl: { type: String, default: '' },
    spreadsheetTemplateUrl: { type: String, default: '' },
    appInstruction: { type: String, default: '' },
    notificationEmail: { type: String, default: '' },
    appEmail: { type: String, default: '' },
    stripePublicKey: { type: String, default: '' },
    stripeSecretKey: { type: String, default: '' },
    stripePaymentMode: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
    stripeWebhookSecret: { type: String, default: '' },
    smtpHost: { type: String, default: 'smtp.gmail.com' },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: '' },
    smtpPass: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model<ISettings>('Settings', SettingsSchema);
