import Settings from '../models/Settings.js';
import { resolvePlaidCredentials } from './envCredentials.js';

/** Plaid error codes indicating the Item is already gone. */
const ITEM_ALREADY_GONE = ['ITEM_NOT_FOUND', 'INVALID_ACCESS_TOKEN'];

/**
 * Remove Plaid Items for a list of accounts, grouped by item_id so each Item
 * is removed only once. Accounts whose Item could not be removed are excluded
 * from the returned removableAccountIds — the caller should keep them so the
 * access token is not lost while the Item continues to be billed.
 */
export async function removePlaidItemsForAccounts(
    accounts: any[],
    userEmail?: string,
): Promise<{ removableAccountIds: any[] }> {
    const removableAccountIds: any[] = [];

    if (!accounts || accounts.length === 0) {
        return { removableAccountIds };
    }

    const settings = await Settings.findOne();
    const plaid = settings ? resolvePlaidCredentials(settings, userEmail) : null;

    // Group accounts by item_id
    const byItem = new Map<string, any[]>();
    for (const acc of accounts) {
        if (acc.item_id && acc.access_token) {
            const group = byItem.get(acc.item_id) || [];
            group.push(acc);
            byItem.set(acc.item_id, group);
        } else {
            // No Plaid Item — safe to remove
            removableAccountIds.push(acc._id);
        }
    }

    for (const [itemId, group] of byItem) {
        const accessToken = group[0].access_token;
        let canRemove = true;

        if (plaid?.clientKey && plaid?.secretKey) {
            try {
                const response = await fetch(`${plaid.baseUrl}/item/remove`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        client_id: plaid.clientKey,
                        secret: plaid.secretKey,
                        access_token: accessToken,
                    }),
                });

                if (!response.ok) {
                    const err = (await response.json().catch(() => ({}))) as any;
                    if (!ITEM_ALREADY_GONE.includes(err?.error_code)) {
                        console.error(`Could not remove Plaid item ${itemId}: ${err?.error_code || response.status}`);
                        canRemove = false;
                    }
                }
            } catch (err: any) {
                console.error(`Plaid item/remove error for ${itemId}:`, err.message);
                canRemove = false;
            }
        }

        if (canRemove) {
            removableAccountIds.push(...group.map((a: any) => a._id));
        }
    }

    return { removableAccountIds };
}
