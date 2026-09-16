import User from '../models/User.js';

/**
 * Case-insensitive user lookup by email.
 * Returns the User document or null.
 */
export async function findUserByEmail(email: string) {
    if (!email) return null;
    return User.findOne({ email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
}
