/**
 * Gives existing accounts a link row for the spreadsheet already syncing them.
 *
 * Per-spreadsheet state (cursor, link flag, pending updates) now lives in
 * spreadsheet_accounts. An account from before that change has no row, so the API
 * reports it as not linked anywhere — and a daily sync would quietly find nothing to
 * do until someone opened the spreadsheet and the add-on claimed it.
 *
 * The add-on does claim on its next open and on its next daily run, so this script is
 * belt and braces: it closes the gap immediately, without waiting for either.
 *
 * Only unambiguous users are touched — those with exactly one spreadsheet on record.
 * Where a user has several, only the spreadsheet itself knows which accounts it holds
 * (they are listed in its own Accounts sheet), so those are left to the add-on and are
 * reported here as a count.
 *
 * Two stages, never one:
 *
 *   1. Report (the default, writes nothing):
 *        BACKFILL_MONGODB_URI="mongodb+srv://...snapshot..." npx tsx src/scripts/backfillSpreadsheetLinks.ts
 *
 *   2. Apply, after reading the report:
 *        BACKFILL_MONGODB_URI="..." npx tsx src/scripts/backfillSpreadsheetLinks.ts --apply --confirm=<hash>
 *
 * Reads BACKFILL_MONGODB_URI and never MONGODB_URI, so it cannot reach production from
 * a normal environment by accident.
 */

import mongoose from 'mongoose';
import { createHash } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import Account from '../models/Account.js';
import SpreadsheetAccount from '../models/SpreadsheetAccount.js';
import UserSpreadsheet from '../models/UserSpreadsheet.js';

const REPORT_PATH = process.env.BACKFILL_REPORT_PATH || 'backfill-spreadsheet-links-report.json';

interface PlannedLink {
    userId: string;
    spreadsheetId: string;
    account_id: string;
    accountRef: string;
    next_cursor: string | null;
    is_linked: boolean;
    is_update: boolean;
}

interface Report {
    generatedAt: string;
    database: string;
    links: PlannedLink[];
    skipped: {
        alreadyLinked: number;
        severalSpreadsheets: number;
        noSpreadsheet: number;
        users: string[];
    };
}

function reportHash(report: Report): string {
    return createHash('sha256').update(JSON.stringify(report.links)).digest('hex').slice(0, 16);
}

function arg(name: string): string | undefined {
    const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
    if (!hit) return undefined;
    const eq = hit.indexOf('=');
    return eq === -1 ? '' : hit.slice(eq + 1);
}

async function connect(): Promise<string> {
    const uri = process.env.BACKFILL_MONGODB_URI;
    if (!uri) {
        console.error(
            'BACKFILL_MONGODB_URI is not set.\n' +
            'Set it to the snapshot you want to work on. This script deliberately ignores\n' +
            'MONGODB_URI so it cannot run against production by accident.'
        );
        process.exit(1);
    }
    await mongoose.connect(uri);
    const host = uri.replace(/^mongodb(\+srv)?:\/\/[^@]*@/, '').split('/')[0];
    return host || 'unknown host';
}

async function buildReport(database: string): Promise<Report> {
    const report: Report = {
        generatedAt: new Date().toISOString(),
        database,
        links: [],
        skipped: { alreadyLinked: 0, severalSpreadsheets: 0, noSpreadsheet: 0, users: [] },
    };

    const accounts = await Account.find({ status: true })
        .select('_id account_id user_id next_cursor is_linked is_update')
        .lean();

    const spreadsheetsByUser = new Map<string, string[]>();

    for (const account of accounts as any[]) {
        const userId = String(account.user_id || '');
        const accountId = String(account.account_id || '');
        if (!userId || !accountId) {
            report.skipped.noSpreadsheet++;
            continue;
        }

        // An account that already has a row anywhere is being handled by the new model.
        const existing = await SpreadsheetAccount.countDocuments({ account_id: accountId } as any);
        if (existing > 0) {
            report.skipped.alreadyLinked++;
            continue;
        }

        if (!spreadsheetsByUser.has(userId)) {
            const rows = await UserSpreadsheet.find({ userId } as any).select('spreadsheetId').lean();
            const ids = [...new Set(rows.map((r: any) => String(r.spreadsheetId || '')).filter(Boolean))];
            spreadsheetsByUser.set(userId, ids);
        }

        const ids = spreadsheetsByUser.get(userId) || [];

        if (ids.length === 1) {
            report.links.push({
                userId,
                spreadsheetId: ids[0] as string,
                account_id: accountId,
                accountRef: String(account._id),
                // The spreadsheet carries on from where the shared record had reached,
                // so nothing is re-imported and nothing is skipped.
                next_cursor: account.next_cursor || null,
                is_linked: account.is_linked === true,
                is_update: account.is_update === true,
            });
        } else if (ids.length === 0) {
            report.skipped.noSpreadsheet++;
        } else {
            report.skipped.severalSpreadsheets++;
            if (!report.skipped.users.includes(userId)) report.skipped.users.push(userId);
        }
    }

    return report;
}

function printSummary(report: Report, hash: string) {
    const linked = report.links.filter((l) => l.is_linked).length;

    console.log('');
    console.log(`Database:  ${report.database}`);
    console.log(`Generated: ${report.generatedAt}`);
    console.log('');
    console.log(`Link rows to create:            ${report.links.length}`);
    console.log(`  of which actively synced:     ${linked}`);
    console.log('');
    console.log('Left alone:');
    console.log(`  already have a link row:      ${report.skipped.alreadyLinked}`);
    console.log(`  owner has several sheets:     ${report.skipped.severalSpreadsheets} (${report.skipped.users.length} user(s))`);
    console.log(`  owner has no sheet recorded:  ${report.skipped.noSpreadsheet}`);
    console.log('');
    console.log('Accounts left alone are claimed by the add-on on its next open or next');
    console.log('daily run, so nothing stays stranded either way.');
    console.log('');
    console.log(`Report written to: ${REPORT_PATH}`);
    console.log(`Confirmation hash: ${hash}`);
    console.log('');
    console.log('To apply exactly this plan:');
    console.log(`  npx tsx src/scripts/backfillSpreadsheetLinks.ts --apply --confirm=${hash}`);
    console.log('');
}

async function apply(confirmHash: string) {
    if (!existsSync(REPORT_PATH)) {
        console.error(`No report at ${REPORT_PATH}. Run the report stage first.`);
        process.exit(1);
    }

    const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as Report;
    const hash = reportHash(report);

    if (hash !== confirmHash) {
        console.error(
            `The report does not match --confirm.\n` +
            `  report:  ${hash}\n` +
            `  given:   ${confirmHash}\n` +
            'Re-run the report stage, read it, then apply with the hash it prints.'
        );
        process.exit(1);
    }

    console.log(`Creating ${report.links.length} link row(s)...`);

    let created = 0;
    let existed = 0;

    for (const link of report.links) {
        // $setOnInsert only: a row the add-on has created since the report was produced
        // is the spreadsheet's own account of itself, and is left exactly as it is.
        const result = await SpreadsheetAccount.updateOne(
            { spreadsheetId: link.spreadsheetId, account_id: link.account_id } as any,
            {
                $setOnInsert: {
                    userId: link.userId,
                    accountRef: link.accountRef,
                    next_cursor: link.next_cursor,
                    is_linked: link.is_linked,
                    is_update: link.is_update,
                    linked_date: link.is_linked ? new Date() : null,
                    status: true,
                },
            },
            { upsert: true }
        );
        if (result.upsertedCount > 0) created++;
        else existed++;
    }

    console.log(`Done: ${created} created, ${existed} already existed.`);
}

async function main() {
    const isApply = arg('apply') !== undefined;
    const database = await connect();

    try {
        if (isApply) {
            const confirm = arg('confirm');
            if (!confirm) {
                console.error('--apply needs --confirm=<hash> from the report.');
                process.exit(1);
            }
            await apply(confirm);
        } else {
            const report = await buildReport(database);
            const hash = reportHash(report);
            writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
            printSummary(report, hash);
        }
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error('Backfill failed:', err?.message);
    process.exit(1);
});
