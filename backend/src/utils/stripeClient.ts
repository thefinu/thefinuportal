import Stripe from 'stripe';
import Settings from '../models/Settings.js';

// Stripe API version — keep in sync across the app
export const STRIPE_API_VERSION = '2024-12-18.acacia';

/**
 * Build a Stripe instance from the secret key stored in Settings.
 * Throws if Stripe is not configured.
 */
export const getStripe = async (): Promise<Stripe> => {
    const settings = await Settings.findOne();
    if (!settings || !settings.stripeSecretKey) {
        throw new Error('Stripe is not configured');
    }
    return new Stripe(settings.stripeSecretKey, {
        apiVersion: STRIPE_API_VERSION as any,
    });
};
