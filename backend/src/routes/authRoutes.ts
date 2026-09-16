import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { auth, getJwtSecret } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register a new admin. Requires an existing admin's token: this route used to be
// open, which let anyone on the internet create an admin account and log in with
// it. The very first admin must be created directly in the database.
router.post('/register', auth, async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) return res.status(400).json({ message: 'Admin already exists' });

        const admin = new Admin({ email, password });
        await admin.save();
        res.status(201).json({ message: 'Admin created' });
    } catch (err: any) {
        console.error('Registration error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const secret = getJwtSecret();
        if (!secret) {
            console.error('login: JWT_SECRET is not configured — refusing to issue tokens.');
            return res.status(500).json({ message: 'Server authentication is not configured' });
        }

        const { email, password } = req.body;
        // Strings only: an object such as {"$ne": null} would match the first admin
        // and let passwords be guessed without knowing any admin's email.
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: admin._id },
            secret,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            admin: {
                id: admin._id,
                email: admin.email
            }
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
