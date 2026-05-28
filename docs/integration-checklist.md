# Integration Checklist

Date: 2026-05-25
Owner: budget-integration
Scope: MVP end-to-end integration across frontend, Apps Script API, and Google Sheets.

## Environment variables/config

- [x] Frontend uses a single Apps Script URL via `VITE_APPS_SCRIPT_URL`.
- [x] Dashboard mock toggle supported with `VITE_USE_MOCK_DASHBOARD` (`false` for live backend).
- [x] Import mock toggle supported with `VITE_USE_MOCK_IMPORT` (`false` for live backend).
- [x] Frontend contains no private Google credentials.
- [x] Frontend writes only through Apps Script action-based API.

## Apps Script deployment

- [x] Action routing present in `doGet`/`doPost` for: `config`, `dashboard`, `importFingerprints`, `importBatch`.
- [x] Deployment guidance enforces owner-only access.
- [x] Live deployment URL verified against current Google account deployment.
- [ ] Bound-sheet runtime smoke test completed (manual).
- [ ] CORS/auth redirect behavior resolved for browser runtime path (see `docs/contract-change-requests/CCR-20260525-apps-script-cors.md`).

## API client configuration

- [x] Frontend API client calls `?action=config`.
- [x] Frontend API client calls `?action=dashboard&month=YYYY-MM`.
- [x] Frontend API client calls `?action=importFingerprints`.
- [x] Frontend API client posts `{ action: "importBatch", approvedTransactions }`.
- [x] Frontend parses shared API envelope `{ ok, data/error, meta }`.

## Sheet column verification

- [x] Expenses visible columns preserved and written in mapped order.
- [x] Income visible columns preserved and written in mapped order.
- [x] Metadata columns are created/ensured on both tabs.
- [x] Metadata columns are auto-hidden in Apps Script.
- [x] Imported rows enforce `Entry Method = Importer`.
- [x] Blank historical entry-method cells backfilled to `Manual`.

## Parser integration

- [x] Import page uses `parseRbcCsv(...)` output as review input.
- [x] Parser receives backend-loaded category arrays (expense/income).
- [x] Parser receives backend-loaded existing fingerprint records.
- [x] Fingerprint logic uses original RBC fields for duplicate checks.

## Dashboard integration

- [x] Dashboard loads config and selected-month dashboard data from API.
- [x] Dashboard renders category cards from backend expense categories.
- [x] Dashboard calculation behavior matches contracts (refunds, missing targets, month scope).
- [x] Dashboard now reports clear config-load vs dashboard-load errors.

## Review flow integration

- [x] Review is one-transaction-at-a-time.
- [x] Approve requires valid category and valid transaction fields.
- [x] Duplicate warnings shown from backend-backed duplicate metadata.
- [x] Skip and ignore states are terminal for submission payload.
- [x] Reopen returns reviewed transactions to pending.

## Import submission integration

- [x] Submission sends approved rows only.
- [x] Skipped and ignored rows excluded from payload.
- [x] Backend validates and writes by direction to Expenses/Income tabs.
- [x] App returns to dashboard and refreshes on successful import.

## Error handling

- [x] Categories/targets config load failures are surfaced clearly in dashboard/import flow.
- [x] Dashboard data load failures are surfaced clearly.
- [x] Duplicate metadata load failures are surfaced clearly.
- [x] CSV parsing failures are surfaced clearly in import UI.
- [x] Empty/invalid CSV scenarios are covered by parser/import tests.
- [x] Import submission failures keep review session intact and display clear errors.
- [ ] Live Google Sheets write-failure UX verified against deployed script.

## Security checks

- [x] No LocalStorage/sessionStorage persistence introduced.
- [x] No direct Google Sheets writes from frontend.
- [x] No private credentials in frontend source.
- [x] Apps Script deployment notes require owner-only access.

## Mobile/PWA checks

- [x] Dashboard mobile layout behavior covered in dashboard handoff/tests.
- [x] No horizontal overflow intended on iPhone-sized screens.
- [x] Baseline PWA manifest present.
- [ ] Manual iPhone Safari smoke check pending in deployed environment.

## Final manual QA

- [x] Local integration smoke test file added and passing in test suite.
- [x] Parser/dashboard/duplicate/review targeted tests pass locally.
- [ ] Full end-to-end import against live Apps Script deployment pending (currently blocked by CORS/auth redirect behavior).
- [ ] Final go/no-go signoff pending CCR decision and live validation rerun.
