import Stripe from 'stripe';
import Settings from '../models/Settings.js';
import { resolveStripeCredentials } from './envCredentials.js';

// Stripe API version — keep in sync across the app
export const STRIPE_API_VERSION = '2024-12-18.acacia';

/**
 * Build a Stripe instance from the secret key stored in Settings.
 *
 * Pass `email` for user-scoped operations (checkout, etc.) so that users on the
 * Development Environment allowlist are billed against the TEST Stripe account.
 * Omit `email` for admin/global operations (plan management, webhooks) — those
 * always use the production credentials.
 *
 * Throws if Stripe is not configured for the resolved environment.
 */
export const getStripe = async (email?: string | null): Promise<Stripe> => {
    const settings = await Settings.findOne();
    if (!settings) {
        throw new Error('Stripe is not configured');
    }

    const { secretKey, isDev } = resolveStripeCredentials(settings, email);
    if (!secretKey) {
        throw new Error(isDev
            ? 'Stripe test secret key is not configured in the Development Environment settings'
            : 'Stripe is not configured');
    }

    return new Stripe(secretKey, {
        apiVersion: STRIPE_API_VERSION as any,
    });
};
