import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
    name?: string;
    type?: string;
    balance: number;
    color: string;
    user_id?: mongoose.Types.ObjectId | string;
    spreadsheet_id?: string;
    account_id?: string;
    access_token?: string;
    item_id?: string;
    institution_id?: string;
    institution_name?: string;
    account_type?: string;
    account_subtype?: string;
    mask?: string;
    account_name?: string;
    is_linked: boolean;
    linked_date?: Date;
    next_cursor?: string;
    plaidEnv?: 'sandbox' | 'production' | 'unknown';
    status: boolean;
    is_update: boolean;
    isSubscribed: boolean;
}

const AccountSchema: Schema = new Schema({
    name: { type: String, required: false }, // Made optional to support new flow
    type: { type: String, required: false }, // Made optional
    balance: { type: Number, default: 0 },
    color: { type: String, default: '#3b82f6' },

    // Plaid Integration Fields
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },

    // The spreadsheet this account belongs to. Each spreadsheet connects its own banks
    // and owns its own Plaid Item, so an account is never shared between them — which
    // is what lets each spreadsheet keep its own cursor, link state and update flag on
    // this record. Accounts created before this field exists have no value, and stay
    // visible to any of their owner's spreadsheets until one claims them.
    spreadsheet_id: { type: String, default: undefined, index: true },

    account_id: { type: String, index: true },
    access_token: { type: String },
    // Indexed: the Plaid webhook and Item removal both look accounts up by Item, and
    // the webhook is called often enough that a collection scan there is a real cost.
    item_id: { type: String, index: true },
    institution_id: { type: String },
    institution_name: { type: String },
    account_type: { type: String },
    account_subtype: { type: String },
    mask: { type: String },
    account_name: { type: String },

    // Which Plaid environment this account's access_token belongs to. A sandbox token
    // is meaningless in production and vice versa, and nothing recorded which was
    // which: changing the environment setting silently pointed old tokens at the
    // wrong Plaid. Records written before this field exists are left unset and are
    // treated as production — see utils/recordMode.
    plaidEnv: { type: String, enum: ['sandbox', 'production', 'unknown'], default: undefined },

    // Additional Defaults
    is_linked: { type: Boolean, default: false },
    linked_date: { type: Date, default: null },
    next_cursor: { type: String, default: null },
    status: { type: Boolean, default: true },
    is_update: { type: Boolean, default: false },
    isSubscribed: { type: Boolean, default: false }
}, { timestamps: true, collection: 'accounts' });

export default mongoose.model<IAccount>('Account', AccountSchema);
