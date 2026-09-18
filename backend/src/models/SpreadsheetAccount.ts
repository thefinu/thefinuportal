import mongoose, { Schema, Document } from 'mongoose';

/**
 * One spreadsheet's use of one bank account.
 *
 * The bank connection itself — the Plaid Item and its access token — lives on the
 * Account record and is shared, so connecting the same bank from a second spreadsheet
 * costs nothing extra: that spreadsheet claims the existing connection instead of
 * creating a second billed Item.
 *
 * What cannot be shared is where each spreadsheet has read up to. Plaid's
 * /transactions/sync cursors are held by the caller and are independent of one
 * another, so every spreadsheet keeps its own cursor here, along with whether it syncs
 * this account at all and whether it has updates waiting. Sharing those was what made
 * one spreadsheet's sync consume another's pending updates.
 */
export interface ISpreadsheetAccount extends Document {
    userId: mongoose.Types.ObjectId;
    spreadsheetId: string;
    account_id: string;
    accountRef: mongoose.Types.ObjectId;
    next_cursor?: string | null;
    is_linked: boolean;
    is_update: boolean;
    linked_date?: Date | null;
    status: boolean;
}

const SpreadsheetAccountSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    spreadsheetId: { type: String, required: true },
    account_id: { type: String, required: true },
    accountRef: { type: Schema.Types.ObjectId, ref: 'Account', required: true },

    // This spreadsheet's own reading position in the shared transaction stream.
    next_cursor: { type: String, default: null },

    is_linked: { type: Boolean, default: false },
    is_update: { type: Boolean, default: false },
    linked_date: { type: Date, default: null },
    status: { type: Boolean, default: true },
}, { timestamps: true, collection: 'spreadsheet_accounts' });

// One row per spreadsheet per account. Without this, a link created twice — two tabs,
// two quick clicks — would give the spreadsheet two cursors for one account and each
// sync would fight the other.
SpreadsheetAccountSchema.index({ spreadsheetId: 1, account_id: 1 }, { unique: true });

// "Does any other spreadsheet still use this account?" runs before an account is
// deleted and before a billed Plaid Item is removed. Without this index each of those
// questions scanned the whole collection.
SpreadsheetAccountSchema.index({ account_id: 1 });

export default mongoose.model<ISpreadsheetAccount>('SpreadsheetAccount', SpreadsheetAccountSchema);
