import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    admin?: any;
}

/**
 * The admin JWT signing secret, or null when unset.
 *
 * There is deliberately no fallback. This used to default to a hardcoded string,
 * so on any deployment missing JWT_SECRET, anyone who had read the code could
 * mint a valid admin token. Callers must fail closed on null.
 */
export function getJwtSecret(): string | null {
    const secret = process.env.JWT_SECRET;
    return secret && secret.length > 0 ? secret : null;
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const secret = getJwtSecret();
    if (!secret) {
        console.error('auth: JWT_SECRET is not configured — refusing all admin requests.');
        return res.status(500).json({ message: 'Server authentication is not configured' });
    }

    try {
        const decoded = jwt.verify(token, secret);
        req.admin = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
