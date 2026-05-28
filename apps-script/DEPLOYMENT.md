# Apps Script Deployment Notes (Owner-Only MVP)

## Security Assumption

This MVP assumes owner-only deployment access:

- Deploy as Web App with Execute as: `Me` (owner)
- Who has access: `Only myself`

This is required to keep read/write access private to the owner's Google account.

## Deployment Steps

1. Open the bound Google Sheet and launch Apps Script.
2. Copy code files from `apps-script/` into the Apps Script project:
   - `Code.gs`
   - `config.gs`
   - `sheets.gs`
   - `dashboard.gs`
   - `validation.gs`
   - `import.gs`
3. Save all files.
4. Deploy -> New deployment -> Web app.
5. Set:
   - Execute as: `Me`
   - Who has access: `Only myself`
6. Deploy and capture the Web App URL.
7. Frontend calls this URL with action routing:
   - `GET ?action=config`
   - `GET ?action=dashboard&month=YYYY-MM`
   - `GET ?action=importFingerprints`
   - `POST { "action": "importBatch", "approvedTransactions": [...] }`

## Post-Deploy Smoke Checklist

1. `GET action=config` returns categories and targets from the sheet.
2. `GET action=dashboard&month=2026-05` returns only selected-month rows.
3. `GET action=importFingerprints` returns rows with `Import Fingerprint`.
4. `POST action=importBatch` with approved transactions writes rows and metadata.
5. Metadata columns are present and hidden in `Expenses` and `Income`.
6. Existing rows with blank `Entry Method` are backfilled to `Manual`.
7. New imported rows set `Entry Method = Importer`.
8. Invalid payload returns `ok: false` with `VALIDATION_ERROR`.
9. Full write failure returns `ok: false` with `SHEET_WRITE_ERROR`.
