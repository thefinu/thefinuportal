import type { ISettings } from '../models/Settings.js';

/**
 * Development Environment resolution.
 *
 * A user is a "dev user" when the Development Environment is enabled AND their
 * email appears in Settings.devUsers. Dev users are transparently served the test
 * Plaid/Stripe credentials so they can exercise the real app against sandbox data,
 * while every other user continues to use production credentials.
 */

export interface PlaidCredentials {
    clientKey: string;
    secretKey: string;
    environment: 'sandbox' | 'production';
    webhookUrl: string;
    baseUrl: string;
    isDev: boolean;
}

export interface StripeCredentials {
    publicKey: string;
    secretKey: string;
    webhookSecret: string;
    isDev: boolean;
}

/** True when this email is on the Development Environment allowlist. */
export function isDevUser(settings: Pick<ISettings, 'devEnabled' | 'devUsers'> | null | undefined, email?: string | null): boolean {
    if (!settings?.devEnabled || !email) return false;
    const list = settings.devUsers || [];
    const target = email.trim().toLowerCase();
    return list.some((e) => (e || '').trim().toLowerCase() === target);
}

export const plaidBaseUrlFor = (environment: string): string =>
    environment === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com';

/** Resolve Plaid credentials for a given user (dev allowlist aware). */
export function resolvePlaidCredentials(settings: ISettings, email?: string | null): PlaidCredentials {
    const dev = isDevUser(settings, email);
    const environment = (dev ? settings.devPlaidEnvironment : settings.plaidEnvironment) || 'sandbox';
    return {
        clientKey: dev ? settings.devPlaidClientKey : settings.plaidClientKey,
        secretKey: dev ? settings.devPlaidSecretKey : settings.plaidSecretKey,
        environment: environment as 'sandbox' | 'production',
        webhookUrl: dev ? settings.devPlaidWebhookUrl : settings.plaidWebhookUrl,
        baseUrl: plaidBaseUrlFor(environment),
        isDev: dev,
    };
}

/** Resolve Stripe credentials for a given user (dev allowlist aware). */
export function resolveStripeCredentials(settings: ISettings, email?: string | null): StripeCredentials {
    const dev = isDevUser(settings, email);
    return {
        publicKey: dev ? settings.devStripePublicKey : settings.stripePublicKey,
        secretKey: dev ? settings.devStripeSecretKey : settings.stripeSecretKey,
        webhookSecret: dev ? settings.devStripeWebhookSecret : settings.stripeWebhookSecret,
        isDev: dev,
    };
}
