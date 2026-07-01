import mongoose, { Schema, type Document } from 'mongoose';

export interface IContent extends Document {
    section: string;
    data: unknown;
}

const ContentSchema = new Schema<IContent>({
    section: { type: String, required: true, unique: true },
    data: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true, collection: 'cms_content' });

export default mongoose.model<IContent>('Content', ContentSchema);
