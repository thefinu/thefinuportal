import express from 'express';
import Content from '../models/Content.js';
import { auth } from '../middleware/authMiddleware.js';
import { sanitizeContent } from '../utils/sanitizeHtml.js';

const router = express.Router();

router.get('/:section', async (req, res) => {
    try {
        const content = await Content.findOne({ section: req.params.section });
        res.json({ data: content ? content.data : null });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Internal server error' });
    }
});

router.post('/:section', auth, async (req, res) => {
    try {
        const { data } = req.body;
        if (data === undefined || data === null) {
            return res.status(400).json({ message: 'data is required' });
        }

        // The privacy and terms pages render this with dangerouslySetInnerHTML, so
        // anything executable stored here runs in every visitor's browser. Sanitised on
        // the way IN, so the stored copy is safe for everything that reads it later.
        const safeData = sanitizeContent(data);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content = await Content.findOneAndUpdate(
            { section: req.params.section } as any,
            { $set: { data: safeData }, $setOnInsert: { section: req.params.section } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean<{ data: unknown } | null>();
        res.json({ status: 'success', data: content?.data });
    } catch (err: any) {
        console.error('CMS content save error:', err);
        res.status(500).json({ message: err.message || 'Internal server error' });
    }
});

export default router;
