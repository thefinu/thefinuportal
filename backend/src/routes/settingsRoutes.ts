import express from 'express';
import { GoogleAuth } from 'google-auth-library';
import Settings from '../models/Settings.js';
import { gasAuth, type GasAuthRequest } from '../middleware/gasAuthMiddleware.js';
import { auth } from '../middleware/authMiddleware.js';
import { resolvePlaidCredentials, resolveStripeCredentials } from '../utils/envCredentials.js';

const router = express.Router();

// Get public settings (safe for app/frontend usage — no secrets)
router.get('/public', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            return res.json({
                stripePublicKey: '',
                stripePaymentMode: 'sandbox',
                appInstruction: '',
                appEmail: '',
                spreadsheetTemplateUrl: '',
                plaidEnvironment: 'sandbox'
            });
        }

        res.json({
            stripePublicKey: settings.stripePublicKey,
            stripePaymentMode: settings.stripePaymentMode,
            appInstruction: settings.appInstruction,
            appEmail: settings.appEmail,
            spreadsheetTemplateUrl: settings.spreadsheetTemplateUrl,
            plaidEnvironment: settings.plaidEnvironment,
            plaidClientKey: settings.plaidClientKey
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Get settings (requires GAS OAuth or admin JWT auth)
// Admin JWT gets all fields; GAS clients get Plaid keys but NOT Stripe secret
router.get('/', async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization required' });
    }

    // Check if this is an admin JWT or a GAS OAuth token
    const hasUserEmail = req.header('X-User-Email');

    if (hasUserEmail) {
        // GAS client — validate via Google tokeninfo
        return gasAuth(req as any, res, async () => {
            try {
                let settings = await Settings.findOne();
                if (!settings) {
                    settings = await Settings.create({});
                }

                // Users on the Development Environment allowlist get the TEST
                // credentials, so the add-on runs against sandbox transparently.
                const userEmail = (req as any).gasUser?.email;
                const plaid = resolvePlaidCredentials(settings, userEmail);
                const stripe = resolveStripeCredentials(settings, userEmail);

                res.json({
                    plaidClientKey: plaid.clientKey,
                    plaidSecretKey: plaid.secretKey,
                    plaidEnvironment: plaid.environment,
                    plaidWebhookUrl: plaid.webhookUrl,
                    spreadsheetTemplateUrl: settings.spreadsheetTemplateUrl,
                    appInstruction: settings.appInstruction,
                    appEmail: settings.appEmail,
                    stripePublicKey: stripe.publicKey,
                    stripePaymentMode: plaid.isDev ? 'sandbox' : settings.stripePaymentMode,
                    isDevEnvironment: plaid.isDev
                    // stripeSecretKey intentionally omitted — checkout sessions created server-side
                });
            } catch (err: any) {
                res.status(500).json({ message: err.message });
            }
        });
    } else {
        // Admin JWT — return all fields
        return auth(req as any, res, async () => {
            try {
                let settings = await Settings.findOne();
                if (!settings) {
                    settings = await Settings.create({});
                }
                res.json(settings);
            } catch (err: any) {
                res.status(500).json({ message: err.message });
            }
        });
    }
});

// Sheets API cell value types
interface CellValue {
    stringValue?: string;
    numberValue?: number;
    boolValue?: boolean;
    formulaValue?: string;
}

interface CellData {
    userEnteredValue?: CellValue;
    dataValidation?: {
        condition?: {
            type?: string;
            values?: Array<{ userEnteredValue?: string }>;
        };
        showCustomUi?: boolean;
        strict?: boolean;
    };
}

interface ColumnMetadata {
    pixelSize?: number;
}

interface SheetProperties {
    title?: string;
    gridProperties?: {
        frozenRowCount?: number;
        frozenColumnCount?: number;
        rowCount?: number;
        columnCount?: number;
    };
}

interface SheetData {
    rowData?: Array<{ values?: CellData[] }>;
    columnMetadata?: ColumnMetadata[];
}

interface SpreadsheetSheet {
    properties?: SheetProperties;
    data?: SheetData[];
}

/**
 * @route   GET /api/settings/template-file-id
 * @desc    Returns the template spreadsheet file ID and Google Picker API key.
 *          GAS uses these to open a Drive Picker pre-scoped to the template file,
 *          which grants drive.file per-file access before calling installTemplateFromPicker().
 */
router.get('/template-file-id', gasAuth, async (req: GasAuthRequest, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings || !settings.spreadsheetTemplateUrl) {
            return res.status(404).json({ success: false, message: 'Template URL is not configured in settings.' });
        }

        const match = settings.spreadsheetTemplateUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            return res.status(500).json({ success: false, message: 'Invalid template URL format in settings.' });
        }

        return res.json({
            success: true,
            fileId: match[1] as string,
            pickerApiKey: settings.pickerApiKey || '',
            templateUrl: settings.spreadsheetTemplateUrl
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * @route   POST /api/settings/install-template
 * @desc    Fetches the developer-owned template spreadsheet data using the backend's
 *          own credentials (Application Default Credentials / Cloud Run service account),
 *          then returns all sheet data as structured JSON.
 *
 *          GAS reconstructs the sheets from this JSON using spreadsheets.currentonly
 *          scope — no Drive file copying required, and no broad 'spreadsheets' scope needed.
 *
 *          Prerequisites:
 *            - The template spreadsheet must be shared with the Cloud Run service account:
 *              1014598876589-compute@developer.gserviceaccount.com (Viewer access).
 *            - Locally: run `gcloud auth application-default login` for ADC.
 *
 * @returns { success: true, sheets: SheetJson[] }
 */
router.post('/install-template', gasAuth, async (req: GasAuthRequest, res) => {
    try {
        // 1. Load the template URL from settings
        const settings = await Settings.findOne();
        if (!settings || !settings.spreadsheetTemplateUrl) {
            return res.status(500).json({ success: false, message: 'Template URL is not configured in settings.' });
        }

        // 2. Extract the file ID from the Google Sheets URL
        const match = settings.spreadsheetTemplateUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            return res.status(500).json({ success: false, message: 'Invalid template URL format in settings.' });
        }
        const templateFileId = match[1] as string;

        // 3. Get an access token using ADC (Cloud Run SA in production, developer credentials locally)
        const googleAuth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const client = await googleAuth.getClient();
        const tokenResponse = await client.getAccessToken();
        const accessToken = tokenResponse.token;

        if (!accessToken) {
            return res.status(500).json({ success: false, message: 'Could not obtain service credentials. Check Cloud Run service account permissions.' });
        }

        // 4. Fetch template sheet data — only the fields GAS needs for reconstruction
        const fields = [
            'sheets(properties(title,gridProperties(frozenRowCount,frozenColumnCount,rowCount,columnCount))',
            'data(rowData(values(userEnteredValue,dataValidation(condition(type,values(userEnteredValue)),showCustomUi,strict)))',
            'columnMetadata(pixelSize)))',
        ].join(',');

        const sheetsResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(templateFileId)}?includeGridData=true&fields=${encodeURIComponent(fields)}`,
            {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            }
        );

        if (!sheetsResponse.ok) {
            const errorBody = await sheetsResponse.text();
            console.error('install-template: Sheets API fetch failed:', sheetsResponse.status, errorBody);
            return res.status(502).json({ success: false, message: 'Failed to read template data. Ensure the template is shared with the service account.' });
        }

        const spreadsheet = await sheetsResponse.json() as { sheets?: SpreadsheetSheet[] };

        if (!spreadsheet.sheets || spreadsheet.sheets.length === 0) {
            return res.status(502).json({ success: false, message: 'Template spreadsheet appears to be empty.' });
        }

        // 5. Transform into a compact JSON structure for GAS
        const sheets = spreadsheet.sheets.map((sheet) => {
            const props = sheet.properties || {};
            const gridProps = props.gridProperties || {};
            const sheetDataArray = sheet.data || [];
            const gridData = sheetDataArray[0] || {};
            const rowDataArray = gridData.rowData || [];
            const columnMetadata = gridData.columnMetadata || [];

            // Build a compact rows array — only rows with at least one non-empty cell
            const rows: Array<Array<{ v?: string | number | boolean; f?: string; dv?: object }>> = [];
            let lastNonEmptyRow = -1;

            rowDataArray.forEach((rowData, rowIndex) => {
                const cells: Array<{ v?: string | number | boolean; f?: string; dv?: object }> = [];
                const cellValues = rowData.values || [];
                let rowHasContent = false;

                cellValues.forEach((cell: CellData) => {
                    const uev = cell.userEnteredValue;
                    let cellObj: { v?: string | number | boolean; f?: string; dv?: object } = {};

                    if (uev?.formulaValue) {
                        cellObj.f = uev.formulaValue;
                        rowHasContent = true;
                    } else if (uev?.stringValue !== undefined && uev.stringValue !== '') {
                        cellObj.v = uev.stringValue;
                        rowHasContent = true;
                    } else if (uev?.numberValue !== undefined) {
                        cellObj.v = uev.numberValue;
                        rowHasContent = true;
                    } else if (uev?.boolValue !== undefined) {
                        cellObj.v = uev.boolValue;
                        rowHasContent = true;
                    }

                    if (cell.dataValidation?.condition) {
                        cellObj.dv = cell.dataValidation;
                        rowHasContent = true;
                    }

                    cells.push(cellObj);
                });

                rows[rowIndex] = cells;
                if (rowHasContent) lastNonEmptyRow = rowIndex;
            });

            // Trim trailing empty rows
            const trimmedRows = rows.slice(0, lastNonEmptyRow + 1);

            // Column widths (only include non-default widths, default is 100px)
            const columnWidths = columnMetadata.map((col: ColumnMetadata) => col.pixelSize || 100);

            return {
                name: props.title || '',
                frozenRows: gridProps.frozenRowCount || 0,
                frozenCols: gridProps.frozenColumnCount || 0,
                columnWidths,
                rows: trimmedRows,
            };
        });

        return res.json({ success: true, sheets });

    } catch (err: any) {
        console.error('install-template error:', err);
        return res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
    }
});

/**
 * @route   POST /api/settings/prepare-template
 * @desc    Creates a clean temp spreadsheet in the user's Drive populated with
 *          all template sheets (properly named, no "Copy of" prefix).
 *
 *          1. Create an empty spreadsheet using the user's OAuth token (drive.file covers it).
 *          2. Add the SA as editor on the temp spreadsheet (user's token, drive.file).
 *          3. SA copies each sheet from the master template → temp, then renames
 *             (removes "Copy of" prefix).
 *          4. SA removes itself from the temp spreadsheet.
 *          5. Return tempFileId + sheet list so GAS can copyTo each sheet into dest.
 *
 *          Body: { }
 */
router.post('/prepare-template', gasAuth, async (req: GasAuthRequest, res) => {
    let tempFileId: string | null = null;
    const userToken = req.header('Authorization')?.replace(/^Bearer\s+/i, '') || null;

    try {
        if (!userToken) {
            return res.status(401).json({ success: false, message: 'Missing user OAuth token.' });
        }

        // 1. Load template URL from settings
        const settings = await Settings.findOne();
        if (!settings || !settings.spreadsheetTemplateUrl) {
            return res.status(500).json({ success: false, message: 'Template URL is not configured in settings.' });
        }
        const match = settings.spreadsheetTemplateUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            return res.status(500).json({ success: false, message: 'Invalid template URL format in settings.' });
        }
        const templateFileId = match[1] as string;

        // 2. Get SA token
        const googleAuth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
        });
        const client = await googleAuth.getClient();
        const saToken = (await client.getAccessToken()).token;
        if (!saToken) {
            return res.status(500).json({ success: false, message: 'Could not obtain service credentials.' });
        }

        // 3. Create empty spreadsheet using user's token (drive.file covers it)
        const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ properties: { title: 'TheFinU Template (temp)' } }),
        });
        if (!createRes.ok) {
            console.error('prepare-template: create failed:', await createRes.text());
            return res.status(502).json({ success: false, message: 'Could not create temp spreadsheet.' });
        }
        tempFileId = ((await createRes.json()) as any).spreadsheetId;

        // 4. Add SA as editor on temp (user's token — drive.file covers this file)
        const saEmail = (await googleAuth.getClient() as any).email
            || process.env.SA_EMAIL
            || '1014598876589-compute@developer.gserviceaccount.com';

        const permRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${tempFileId}/permissions`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: saEmail }),
            }
        );
        if (!permRes.ok) {
            console.error('prepare-template: permission failed:', await permRes.text());
            // Clean up
            await fetch(`https://www.googleapis.com/drive/v3/files/${tempFileId}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${userToken}` },
            }).catch(() => {});
            return res.status(502).json({ success: false, message: 'Could not grant SA access to temp file.' });
        }

        // 5. Get template sheet metadata
        const metaRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${templateFileId}?fields=sheets.properties`,
            { headers: { 'Authorization': `Bearer ${saToken}` } }
        );
        if (!metaRes.ok) {
            console.error('prepare-template: meta failed:', await metaRes.text());
            return res.status(502).json({ success: false, message: 'Could not read template.' });
        }
        const templateSheets = ((await metaRes.json()) as any).sheets || [];

        // Helper: copyTo with retries — Google 500 INTERNAL errors are often transient
        const copySheetWithRetry = async (srcSheetId: number, destId: string, token: string, maxAttempts = 3): Promise<{ sheetId: number; title: string } | null> => {
            let lastError = '';
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const copyRes = await fetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${templateFileId}/sheets/${srcSheetId}:copyTo`,
                    {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ destinationSpreadsheetId: destId }),
                    }
                );
                if (copyRes.ok) {
                    return (await copyRes.json()) as { sheetId: number; title: string };
                }
                lastError = await copyRes.text();
                console.warn(`prepare-template: copyTo attempt ${attempt}/${maxAttempts} failed:`, lastError);
                if (attempt < maxAttempts) {
                    await new Promise(r => setTimeout(r, 1500 * attempt));
                }
            }
            console.error(`prepare-template: copyTo exhausted retries:`, lastError);
            return null;
        };

        // 6. SA copies each sheet from template → temp, then renames
        const sheets: Array<{ name: string; sheetId: number }> = [];
        const failedSheets: string[] = [];

        // Brief delay to allow SA permission to propagate before first copyTo
        await new Promise(r => setTimeout(r, 1500));

        for (const sheet of templateSheets) {
            const sheetName: string = sheet.properties?.title || '';
            const srcSheetId: number = sheet.properties?.sheetId;

            const copiedProps = await copySheetWithRetry(srcSheetId, tempFileId as string, saToken);
            if (!copiedProps) {
                failedSheets.push(sheetName);
                continue;
            }

            // rename "Copy of X" → "X"
            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${tempFileId}:batchUpdate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${saToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requests: [{ updateSheetProperties: {
                        properties: { sheetId: copiedProps.sheetId, title: sheetName },
                        fields: 'title',
                    }}],
                }),
            });

            sheets.push({ name: sheetName, sheetId: copiedProps.sheetId });
        }

        // 7. Delete the default "Sheet1" from the temp spreadsheet
        const tempMeta = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${tempFileId}?fields=sheets.properties`,
            { headers: { 'Authorization': `Bearer ${saToken}` } }
        );
        if (tempMeta.ok) {
            const tempSheets = ((await tempMeta.json()) as any).sheets || [];
            const defaultSheet = tempSheets.find((s: any) => s.properties?.title === 'Sheet1');
            if (defaultSheet) {
                await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${tempFileId}:batchUpdate`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${saToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requests: [{ deleteSheet: { sheetId: defaultSheet.properties.sheetId } }] }),
                });
            }
        }

        if (failedSheets.length > 0 && sheets.length === 0) {
            // All sheets failed — clean up and report error
            await fetch(`https://www.googleapis.com/drive/v3/files/${tempFileId}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${userToken}` },
            }).catch(() => {});
            return res.status(502).json({
                success: false,
                message: `Could not copy any template sheets. Failed: ${failedSheets.join(', ')}`,
                failedSheets,
            });
        }

        return res.json({ success: true, result: { tempFileId, sheets, failedSheets } });

    } catch (err: any) {
        console.error('prepare-template error:', err);
        if (tempFileId && userToken) {
            await fetch(`https://www.googleapis.com/drive/v3/files/${tempFileId}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${userToken}` },
            }).catch(() => {});
        }
        return res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
    }
});

// Update settings (admin only)
router.post('/', auth, async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings(req.body);
        } else {
            // Remove _id and __v from req.body to prevent conflicts
            const { _id, __v, ...updateData } = req.body;
            Object.assign(settings, updateData);
        }
        await settings.save();
        res.json(settings);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

export default router;
