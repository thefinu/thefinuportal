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

// Everything a visitor types ends up in an HTML email, so it is escaped. Unescaped,
// the form delivered arbitrary HTML (links, forms, tracking images) to the inbox.
function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Single-line text for the sender name and subject.
function headerText(value: unknown, maxLength: number): string {
    return String(value ?? '').replace(/[\r\n"<>]/g, ' ').trim().slice(0, maxLength);
}

const EMAIL_PATTERN = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const MAX_TEXT = 5000;

function isFilledString(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
}

function isEmail(value: unknown): value is string {
    return typeof value === 'string' && value.length <= 254 && EMAIL_PATTERN.test(value);
}

// POST /contact — General contact form
router.post('/', async (req: Request, res: Response) => {
    const { firstName, lastName, email, message } = req.body;

    if (![firstName, lastName, email, message].every(isFilledString)) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }
    if (!isEmail(email)) {
        res.status(400).json({ error: 'Please enter a valid email address' });
        return;
    }
    if (message.length > MAX_TEXT) {
        res.status(400).json({ error: 'Message is too long' });
        return;
    }

    try {
        const { transporter, user, contactEmail } = await getMailerConfig();
        const name = headerText(`${firstName} ${lastName}`, 100);
        await transporter.sendMail({
            from: `"${name}" <${user}>`,
            replyTo: email,
            to: contactEmail,
            subject: `New Contact Message from ${name}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
                <p><strong>Email:</strong> ${escapeHtml(email)}</p>
                <p><strong>Message:</strong></p>
                <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
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

    if (![firstName, email, feature, details].every(isFilledString)) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }
    if (!isEmail(email)) {
        res.status(400).json({ error: 'Please enter a valid email address' });
        return;
    }
    if (details.length > MAX_TEXT || feature.length > 200) {
        res.status(400).json({ error: 'Request is too long' });
        return;
    }

    try {
        const { transporter, user, contactEmail } = await getMailerConfig();
        const name = headerText(firstName, 100);
        await transporter.sendMail({
            from: `"${name}" <${user}>`,
            replyTo: email,
            to: contactEmail,
            subject: `Feature Request: ${headerText(feature, 150)} — from ${name}`,
            html: `
                <h2>New Feature Request</h2>
                <p><strong>Name:</strong> ${escapeHtml(firstName)}</p>
                <p><strong>Email:</strong> ${escapeHtml(email)}</p>
                <p><strong>Feature:</strong> ${escapeHtml(feature)}</p>
                <p><strong>Details:</strong></p>
                <p>${escapeHtml(details).replace(/\n/g, '<br>')}</p>
            `,
        });

        res.json({ success: true, message: 'Feature request submitted successfully' });
    } catch (err) {
        console.error('Feature request email error:', err);
        res.status(500).json({ error: 'Failed to send feature request' });
    }
});

export default router;
