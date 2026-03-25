import { Router, type Request, type Response } from 'express';
import nodemailer from 'nodemailer';
import Settings from '../models/Settings.js';

const router = Router();

async function getMailerConfig() {
    const settings = await Settings.findOne();
    const host = settings?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = settings?.smtpPort || Number(process.env.SMTP_PORT) || 587;
    const user = settings?.smtpUser || process.env.SMTP_USER || '';
    const pass = settings?.smtpPass || process.env.SMTP_PASS || '';
    const contactEmail = settings?.contactEmail || process.env.CONTACT_EMAIL || 'anna@thefinu.com';

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: { user, pass },
    });

    return { transporter, user, contactEmail };
}

// POST /contact — General contact form
router.post('/', async (req: Request, res: Response) => {
    const { firstName, lastName, email, message } = req.body;

    if (!firstName || !lastName || !email || !message) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }

    try {
        const { transporter, user, contactEmail } = await getMailerConfig();
        await transporter.sendMail({
            from: `"${firstName} ${lastName}" <${user}>`,
            replyTo: email,
            to: contactEmail,
            subject: `New Contact Message from ${firstName} ${lastName}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `,
        });

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (err) {
        console.error('Contact email error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// POST /contact/feature-request — Feature request form
router.post('/feature-request', async (req: Request, res: Response) => {
    const { firstName, email, feature, details } = req.body;

    if (!firstName || !email || !feature || !details) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }

    try {
        const { transporter, user, contactEmail } = await getMailerConfig();
        await transporter.sendMail({
            from: `"${firstName}" <${user}>`,
            replyTo: email,
            to: contactEmail,
            subject: `Feature Request: ${feature} — from ${firstName}`,
            html: `
                <h2>New Feature Request</h2>
                <p><strong>Name:</strong> ${firstName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Feature:</strong> ${feature}</p>
                <p><strong>Details:</strong></p>
                <p>${details}</p>
            `,
        });

        res.json({ success: true, message: 'Feature request submitted successfully' });
    } catch (err) {
        console.error('Feature request email error:', err);
        res.status(500).json({ error: 'Failed to send feature request' });
    }
});

export default router;
