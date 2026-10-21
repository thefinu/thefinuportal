import mongoose, { Schema, Document } from 'mongoose';

/**
 * A record of every time an Account document's Plaid identity is created, replaced, or
 * removed, and every time an Item is flagged as needing reconnection.
 *
 * Nothing used to log this at all. Reconstructing what happened to one account — did it
 * get relinked, deleted by a webhook, removed by an admin — meant correlating database
 * timestamps with Plaid dashboard screenshots after the fact, which is slow and often
 * inconclusive (see the investigation that led to this file). This is written at every
 * point that creates, overwrites, or deletes an Account's item_id/access_token, or marks
 * one as needing reconnection, so the next time an account goes quiet the answer is a
 * lookup instead of a reconstruction.
 *
 * Deliberately NOT a foreign-keyed collection: the Account it describes may since have
 * been deleted, so accountId is stored as a plain string, not a ref, and every field
 * that matters for diagnosis is copied in rather than looked up.
 */
export interface IAccountAudit extends Document {
    accountId: string | null;
    userId: mongoose.Types.ObjectId | null;
    userEmail: string | null;
    event: 'created' | 'relinked' | 'deleted' | 'needs_reconnect' | 'reconnected';
    reason: string;
    accountIdPlaid: string | null;
    institutionName: string | null;
    previousItemId: string | null;
    newItemId: string | null;
}

const AccountAuditSchema: Schema = new Schema({
    // The Account document's Mongo _id, as a plain string — never a ref, since the
    // document this describes may since have been deleted.
    accountId: { type: String, default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    userEmail: { type: String, default: null },

    event: {
        type: String,
        enum: ['created', 'relinked', 'deleted', 'needs_reconnect', 'reconnected'],
        required: true,
    },
    // Short, human-readable: which code path wrote this (e.g. "store-plaid: new
    // institution+mask+name combination", "subscription cancelled", "admin delete").
    reason: { type: String, required: true },

    accountIdPlaid: { type: String, default: null },
    institutionName: { type: String, default: null },
    // Set on 'relinked': the item_id this Account had before and after the overwrite.
    previousItemId: { type: String, default: null },
    newItemId: { type: String, default: null },
}, { timestamps: true });

AccountAuditSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IAccountAudit>('AccountAudit', AccountAuditSchema);
