import type { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
    windowMs: number;
    max: number;
}

/**
 * Simple in-memory rate limiter. Each Cloud Run instance keeps its own counters,
 * so across N instances the effective limit is N × max per window.
 */
export function rateLimit({ windowMs, max }: RateLimitOptions) {
    const hits = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
        const key = req.ip || 'unknown';
        const now = Date.now();
        const record = hits.get(key);

        if (!record || now > record.resetTime) {
            hits.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }

        record.count++;
        if (record.count > max) {
            const retryAfter = Math.ceil((record.resetTime - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ message: 'Too many requests, please try again later.' });
        }

        next();
    };
}
