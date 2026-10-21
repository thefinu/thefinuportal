import AccountAudit from '../models/AccountAudit.js';

interface AuditInput {
    accountId: string | null;
    userId?: unknown;
    userEmail?: string | null | undefined;
    event: 'created' | 'relinked' | 'deleted' | 'needs_reconnect' | 'reconnected';
    reason: string;
    accountIdPlaid?: string | null | undefined;
    institutionName?: string | null | undefined;
    previousItemId?: string | null | undefined;
    newItemId?: string | null | undefined;
}

/**
 * Writes one AccountAudit row. Never throws: a logging failure must not block the
 * account operation it is describing, so every error is swallowed and reported to the
 * console instead.
 */
export async function logAccountEvent(entry: AuditInput): Promise<void> {
    try {
        await AccountAudit.create({
            accountId: entry.accountId,
            userId: entry.userId ? (entry.userId as any) : null,
            userEmail: entry.userEmail || null,
            event: entry.event,
            reason: entry.reason,
            accountIdPlaid: entry.accountIdPlaid || null,
            institutionName: entry.institutionName || null,
            previousItemId: entry.previousItemId || null,
            newItemId: entry.newItemId || null,
        });
    } catch (err: any) {
        console.error('logAccountEvent failed:', err?.message);
    }
}
