import mongoose, { Schema } from 'mongoose';

const ContentSchema = new Schema({
    section: { type: String, required: true, unique: true },
    data: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true, collection: 'cms_content' });

export default mongoose.model('Content', ContentSchema);
