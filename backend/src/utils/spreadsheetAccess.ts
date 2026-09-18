import UserSpreadsheet from '../models/UserSpreadsheet.js';

/**
 * The spreadsheet a request is about, confirmed to belong to the caller.
 *
 * X-Spreadsheet-Id arrives from the add-on and is not proof of anything on its own.
 * Reads were already safe, because every query also filters by user — but writes key
 * link rows on { spreadsheetId, account_id }, so an unchecked header let a caller
 * create rows under someone else's spreadsheet id. Those rows then skew the "is any
 * other spreadsheet still using this account?" counts that guard deleting an account
 * and removing a billed Plaid Item.
 *
 * Returns '' when the header is absent (an older add-on, which is served unscoped) and
 * throws SpreadsheetAccessError when it names a spreadsheet that is not the caller's.
 *
 * The answer is cached per request: several routes ask, and this is a database lookup.
 */
export class SpreadsheetAccessError extends Error {
    constructor() {
        super('This spreadsheet does not belong to you.');
        this.name = 'SpreadsheetAccessError';
    }
}

export async function verifiedSpreadsheetId(req: any, userId: unknown): Promise<string> {
    if (typeof req.__verifiedSpreadsheetId === 'string') return req.__verifiedSpreadsheetId;

    const raw = req.header('X-Spreadsheet-Id');
    const spreadsheetId = typeof raw === 'string' ? raw.trim() : '';

    if (!spreadsheetId) {
        req.__verifiedSpreadsheetId = '';
        return '';
    }

    const owned = await UserSpreadsheet.exists({ userId, spreadsheetId } as any);
    if (!owned) {
        // validate-user records a spreadsheet the first time the add-on opens in it, so
        // a legitimate spreadsheet is always on file by the time it does anything else.
        throw new SpreadsheetAccessError();
    }

    req.__verifiedSpreadsheetId = spreadsheetId;
    return spreadsheetId;
}
