import { createHash, createPublicKey } from 'crypto';
import jwt from 'jsonwebtoken';
import Settings from '../models/Settings.js';
import { resolvePlaidCredentials } from './envCredentials.js';

/**
 * Verifies that a webhook really came from Plaid.
 *
 * The endpoint has to be reachable without a login, which meant anyone who learned an
 * item_id could flag every spreadsheet on that Item for sync — each flag costing a
 * billed Plaid call, and each unauthenticated request costing a database lookup.
 *
 * Plaid signs every webhook with a JWT in the plaid-verification header: ES256, with a
 * key id naming a public key fetched from Plaid, and a SHA-256 of the request body. All
 * three are checked here — signature, body hash, and age.
 *
 * Fail closed: an unverified webhook is rejected. Plaid retries, so a transient failure
 * to fetch the key costs a delay rather than lost updates. Set PLAID_WEBHOOK_VERIFY to
 * "false" to turn the check off if it ever misfires in production.
 */

// Public keys, cached by id. They are stable, and fetching one per webhook would add a
// round trip to Plaid on every delivery.
const keyCache = new Map<string, any>();

// A signature older than this is not accepted, so a captured webhook cannot be replayed
// indefinitely. Plaid's own guidance is five minutes.
const MAX_AGE_MS = 5 * 60 * 1000;

export function webhookVerificationEnabled(): boolean {
    return (process.env.PLAID_WEBHOOK_VERIFY || '').trim().toLowerCase() !== 'false';
}

async function fetchVerificationKey(keyId: string): Promise<any | null> {
    if (keyCache.has(keyId)) return keyCache.get(keyId);

    const settings = await Settings.findOne();
    if (!settings) return null;

    // The webhook does not say which user it belongs to, so the default (non-developer)
    // credentials are used. A sandbox webhook verified against production keys simply
    // fails, which is the safe direction.
    const plaid = resolvePlaidCredentials(settings, null);
    if (!plaid.clientKey || !plaid.secretKey) return null;

    const response = await fetch(`${plaid.baseUrl}/webhook_verification_key/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: plaid.clientKey,
            secret: plaid.secretKey,
            key_id: keyId,
        }),
    });

    if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as any;
        console.error(`Plaid webhook key fetch failed: ${err?.error_code || response.status}`);
        return null;
    }

    const body = (await response.json()) as any;
    const key = body?.key;
    if (!key) return null;

    // Plaid marks a retired key with an expiry; those are not cached.
    if (!key.expired_at) keyCache.set(keyId, key);
    return key;
}

/**
 * @param verificationHeader the plaid-verification header
 * @param rawBody the exact bytes of the request body, before JSON parsing
 * @returns true when the webhook is genuine
 */
export async function verifyPlaidWebhook(
    verificationHeader: string | undefined,
    rawBody: Buffer | undefined
): Promise<boolean> {
    if (!webhookVerificationEnabled()) return true;

    if (!verificationHeader || !rawBody) {
        console.warn('Plaid webhook rejected: missing verification header or body');
        return false;
    }

    try {
        const decoded: any = jwt.decode(verificationHeader, { complete: true });

        // ES256 only. Accepting the algorithm named in the token itself is how "alg:
        // none" and HMAC-with-the-public-key forgeries work.
        if (!decoded || decoded.header?.alg !== 'ES256' || !decoded.header?.kid) {
            console.warn('Plaid webhook rejected: unexpected JWT header');
            return false;
        }

        const jwk = await fetchVerificationKey(decoded.header.kid);
        if (!jwk) {
            console.error('Plaid webhook rejected: verification key unavailable');
            return false;
        }

        const publicKey = createPublicKey({ key: jwk, format: 'jwk' } as any);
        const claims: any = jwt.verify(verificationHeader, publicKey as any, { algorithms: ['ES256'] });

        const issuedAtMs = Number(claims?.iat || 0) * 1000;
        if (!issuedAtMs || Date.now() - issuedAtMs > MAX_AGE_MS) {
            console.warn('Plaid webhook rejected: signature too old');
            return false;
        }

        // The signature covers a hash of the body, so this is what ties it to THIS
        // request rather than any other webhook Plaid signed.
        const bodyHash = createHash('sha256').update(rawBody).digest('hex');
        if (bodyHash !== claims?.request_body_sha256) {
            console.warn('Plaid webhook rejected: body does not match the signature');
            return false;
        }

        return true;
    } catch (err: any) {
        console.error('Plaid webhook verification error:', err?.message);
        return false;
    }
}
