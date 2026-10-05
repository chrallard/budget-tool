# Apps Script Deployment Notes

## Security Assumption

The site is a public page, so Google’s “Only myself” web-app setting cannot be used. That setting redirects anonymous calls to a Google login page, which the browser blocks.

Lock the API with a shared access key instead:

- Deploy as Web App with Execute as: `Me` (owner)
- Who has access: `Anyone`
- Script property `APP_ACCESS_KEY`: a long random secret only you know

Set the property in the Apps Script editor under Project Settings → Script properties. Requests without that exact `key` are rejected before any sheet data is read or written. The React app asks for the key and keeps it in memory for the tab.

## Deployment Steps

1. Open the bound Google Sheet and launch Apps Script.
2. Copy code files from `apps-script/` into the Apps Script project:
   - `Code.gs`
   - `config.gs`
   - `sheets.gs`
   - `dashboard.gs`
   - `validation.gs`
   - `import.gs`
   - `allotments.gs`
3. Save all files.
4. Deploy -> New deployment -> Web app.
5. Set:
   - Execute as: `Me`
   - Who has access: `Anyone`
6. Add Script property `APP_ACCESS_KEY` with a long random secret.
7. Deploy and capture the Web App URL.
8. Frontend calls this URL with action routing, including `key` on every request:
   - `GET ?action=config&key=<APP_ACCESS_KEY>`
   - `GET ?action=dashboard&month=YYYY-MM&key=<APP_ACCESS_KEY>`
   - `GET ?action=importFingerprints&key=<APP_ACCESS_KEY>`
   - `POST { "action": "importBatch", "key": "<APP_ACCESS_KEY>", "approvedTransactions": [...] }`

## Post-Deploy Smoke Checklist

1. A request without `key` returns `UNAUTHORIZED` and no sheet data.
2. `GET action=config&key=<APP_ACCESS_KEY>` returns categories and targets from the sheet.
3. `GET action=dashboard&month=2026-05` returns only selected-month rows.
4. `GET action=importFingerprints` returns rows with `Import Fingerprint`.
5. `POST action=importBatch` with approved transactions writes rows and metadata. An expense `allotmentId` appends the new row id to that allotment.
6. Metadata columns are present and hidden in `Expenses` and `Income`.
7. Existing rows with blank `Entry Method` are backfilled to `Manual`.
8. New imported rows set `Entry Method = Importer`.
9. Invalid payload returns `ok: false` with `VALIDATION_ERROR`.
10. Full write failure returns `ok: false` with `SHEET_WRITE_ERROR`.
11. Expense rows have a hidden `Row Id`. Blank ids are backfilled. New imports write one.
12. `GET action=allotments&profitMonth=YYYY-MM` returns plans with `category` and `expenseIds`. `Spent` is ignored.
