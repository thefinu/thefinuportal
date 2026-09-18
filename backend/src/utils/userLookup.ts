import User from '../models/User.js';

/**
 * Case-insensitive user lookup by email.
 *
 * Tries the lowercased address first, which uses the unique index on email. The
 * case-insensitive regex is kept only as a fallback for records stored with mixed case:
 * a regex cannot use that index, so running it first meant a full scan of the users
 * collection on EVERY add-on request.
 *
 * Returns the User document or null.
 */
export async function findUserByEmail(email: string) {
    if (!email) return null;

    const normalised = email.trim().toLowerCase();

    const exact = await User.findOne({ email: normalised });
    if (exact) return exact;

    // Legacy rows whose stored address is not lowercase.
    const escaped = normalised.replace(/[.*+?^${}()|[]\]/g, '\$&');
    return User.findOne({ email: { $regex: new RegExp(`^${escaped}$`, 'i') } });
}
