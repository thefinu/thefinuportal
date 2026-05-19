import express from 'express';
import Content from '../models/Content.js';
import { auth } from '../middleware/authMiddleware.js';

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
        const content = await Content.findOneAndUpdate(
            { section: req.params.section },
            { section: req.params.section, data },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json({ status: 'success', data: content.data });
    } catch (err: any) {
        console.error('CMS content save error:', err);
        res.status(500).json({ message: err.message || 'Internal server error' });
    }
});

export default router;
