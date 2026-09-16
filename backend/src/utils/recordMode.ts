/**
 * Plaid environment detection and Stripe/Plaid mode-filtering utilities.
 *
 * These helpers let the admin panel separate live from test/sandbox data and
 * prevent cross-mode actions (e.g. a test webhook deleting live user data).
 */

/** Derive the Plaid environment from an access token string. */
export function plaidEnvFromToken(token: string | undefined | null): 'sandbox' | 'production' | 'unknown' {
    if (!token || typeof token !== 'string') return 'unknown';
    if (token.startsWith('access-sandbox-')) return 'sandbox';
    if (token.startsWith('access-production-')) return 'production';
    return 'unknown';
}

/** Derive the Plaid environment from a Plaid API URL. */
export function plaidEnvFromUrl(url: string | undefined | null): 'sandbox' | 'production' | 'unknown' {
    if (!url || typeof url !== 'string') return 'unknown';
    if (url.includes('sandbox.plaid.com')) return 'sandbox';
    if (url.includes('production.plaid.com')) return 'production';
    return 'unknown';
}

/**
 * Returns a Mongoose filter object for Plaid usage records.
 * ?mode=test → sandbox calls only; anything else → production calls.
 */
export function plaidEnvModeFilter(mode: unknown): Record<string, unknown> {
    if (mode === 'test') return { plaidEnv: 'sandbox' };
    return { plaidEnv: { $ne: 'sandbox' } };
}

/**
 * Returns a Mongoose filter object for Subscription records.
 * ?mode=test → test-mode subscriptions only; anything else → live ones.
 */
export function subscriptionModeFilter(mode: unknown): Record<string, unknown> {
    if (mode === 'test') return { livemode: false };
    return { livemode: { $ne: false } };
}

/**
 * Logs and returns true when a stored record's mode disagrees with an incoming
 * event's mode. When true the caller should skip processing to prevent
 * cross-mode actions (e.g. a test webhook deleting live data).
 */
export function reportModeMismatch(
    kind: string,
    id: string,
    storedMode: 'live' | 'test' | undefined,
    eventMode: 'live' | 'test',
): boolean {
    if (storedMode === undefined) return false; // mode not yet recorded — allow
    if (storedMode === eventMode) return false;
    console.warn(`Mode mismatch on ${kind} ${id}: stored=${storedMode}, event=${eventMode}`);
    return true;
}
