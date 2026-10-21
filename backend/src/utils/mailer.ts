import nodemailer from 'nodemailer';
import Settings from '../models/Settings.js';

/**
 * Shared SMTP transporter config. Pulled out of contactRoutes.ts, which was the only
 * caller, so the Item-reconnect email can use the same settings without duplicating
 * this lookup.
 */
export async function getMailerConfig() {
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

/** Escapes text dropped into an HTML email body. */
export function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Sends a plain notification email to one user, from the configured SMTP account.
 * Never throws — a failed notification must not fail whatever triggered it (a webhook
 * delivery, in particular, where Plaid interprets a failure as "retry me").
 */
export async function sendUserEmail(to: string, subject: string, html: string): Promise<void> {
    try {
        const { transporter, user } = await getMailerConfig();
        await transporter.sendMail({ from: user, to, subject, html });
    } catch (err: any) {
        console.error(`sendUserEmail failed (to ${to}):`, err?.message);
    }
}
