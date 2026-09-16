import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

interface GasAuthRequest extends Request {
    gasUser?: {
        email: string;
        verified: boolean;
        clientId?: string;
    };
}

type TokenInfo = {
    email?: string;
    email_verified?: string;
    azp?: string;
    aud?: string;
    exp?: string;
};

/**
 * OAuth client IDs whose tokens this API accepts, from GAS_OAUTH_CLIENT_IDS
 * (comma-separated).
 *
 * Google's tokeninfo proves a token is genuine and names its user — but not WHICH
 * application it was issued to. Without this check, a token minted by any app for
 * any Google account was accepted, including one a person generates for themselves
 * in a public OAuth tool. That was enough to read the Plaid credentials.
 *
 * Rollout: while the variable is unset, the check only LOGS each distinct client
 * ID it sees, so the add-on's real ID can be read from production logs and set
 * before anything is enforced. Nothing is rejected in log-only mode.
 */
function allowedClientIds(): Set<string> {
    return new Set(
        (process.env.GAS_OAUTH_CLIENT_IDS || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
    );
}

// Log each unseen client ID once per process, not once per request.
const loggedClientIds = new Set<string>();

// Verified tokens, cached briefly by hash. Every add-on request used to call Google's
// tokeninfo endpoint, so each one paid a network round trip, and a flood of junk tokens
// turned into a flood of outbound calls.
const tokenCache = new Map<string, { info: TokenInfo; expiresAt: number }>();
const TOKEN_CACHE_MS = 5 * 60 * 1000;

async function lookupToken(token: string): Promise<TokenInfo | null> {
    const key = createHash('sha256').update(token).digest('hex');
    const now = Date.now();
    const cached = tokenCache.get(key);
    if (cached && cached.expiresAt > now) return cached.info;

    const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`
    );
    if (!response.ok) return null;
    const info = await response.json() as TokenInfo;

    // Never cache past the token's own expiry.
    const tokenExpiresAt = info.exp ? Number(info.exp) * 1000 : now + TOKEN_CACHE_MS;
    if (tokenCache.size > 5000) {
        for (const [k, v] of tokenCache) {
            if (v.expiresAt <= now) tokenCache.delete(k);
        }
    }
    tokenCache.set(key, { info, expiresAt: Math.min(now + TOKEN_CACHE_MS, tokenExpiresAt) });
    return info;
}

/**
 * Middleware to authenticate requests from Google Apps Script clients.
 * Validates the Google OAuth token by calling Google's tokeninfo endpoint,
 * verifies the X-User-Email header matches the token's email, and verifies the
 * token was issued to this add-on (see allowedClientIds).
 */
export const gasAuth = async (req: GasAuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    const userEmail = req.header('X-User-Email');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }

    if (!userEmail) {
        return res.status(401).json({ message: 'Missing X-User-Email header' });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const tokenInfo = await lookupToken(token);

        if (!tokenInfo) {
            return res.status(401).json({ message: 'Invalid or expired OAuth token' });
        }

        if (!tokenInfo.email) {
            return res.status(401).json({ message: 'Token does not contain email information' });
        }

        // Verify the email in the token matches the X-User-Email header
        if (tokenInfo.email.toLowerCase() !== userEmail.toLowerCase()) {
            return res.status(403).json({ message: 'Email mismatch between token and header' });
        }

        // Verify the token was issued to this add-on, not to some other app.
        const clientId = tokenInfo.azp || tokenInfo.aud || '';
        const allowed = allowedClientIds();
        if (allowed.size > 0) {
            if (!allowed.has(clientId)) {
                console.warn(`gasAuth: rejected token issued to client ${clientId || '(none)'} on ${req.method} ${req.originalUrl}`);
                return res.status(403).json({ message: 'Token was not issued for this application' });
            }
        } else if (!loggedClientIds.has(clientId)) {
            loggedClientIds.add(clientId);
            console.warn(`gasAuth: GAS_OAUTH_CLIENT_IDS is not set — accepting client ${clientId || '(none)'} (log-only mode)`);
        }

        req.gasUser = {
            email: tokenInfo.email.toLowerCase(),
            verified: tokenInfo.email_verified === 'true',
            clientId
        };

        next();
    } catch (err: any) {
        console.error('GAS auth middleware error:', err);
        return res.status(500).json({ message: 'Authentication verification failed' });
    }
};

export type { GasAuthRequest };
