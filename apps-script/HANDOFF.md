# Sheets/API Handoff Note

## Endpoints Implemented

- `GET ?action=config&key=<APP_ACCESS_KEY>`
- `GET ?action=dashboard&month=YYYY-MM&key=<APP_ACCESS_KEY>`
- `GET ?action=importFingerprints&key=<APP_ACCESS_KEY>`
- `POST` body `{ "action": "importBatch", "key": "<APP_ACCESS_KEY>", "approvedTransactions": [...] }`

All endpoints return the shared envelope:

- Success: `{ ok: true, data, meta }`
- Error: `{ ok: false, error, meta }`

## Validations Implemented

- Shared access key: every request must include `key` matching Script Property `APP_ACCESS_KEY`. Missing or wrong keys return `UNAUTHORIZED` before any sheet read or write.
- Action allowlist and method/action compatibility.
- `dashboard` month format validation (`YYYY-MM`).
- `importBatch` body shape validation.
- `approvedTransactions` array required.
- Per-transaction validation:
  - `id` required.
  - `direction` must be `income` or `expense`.
  - `displayDate` required and parseable; written as `MM-DD-YYYY`.
  - `editableAmount` numeric and finite.
  - `displayNameOverride` optional; when provided must be non-empty after trimming.
  - `selectedCategory` required and must exist in sheet category list by direction.
  - `importFingerprint` required.
  - `sourceAccount` must be `chequing` or `credit_card`.
  - `originalDate`, `originalAmount`, `originalDescription`, `normalizedDescription` required.
  - If `status` is provided, it must be `approved`.

## Sheet Mapping Behavior

- Reads categories from:
  - `Category Setup!B3:B82` (expense)
  - `Category Setup!B85:B164` (income)
- Reads budget targets by section:
  - Expense: `B/G` from row `7` until blank category.
  - Income: `B/G` from row `91` until blank category.
- Writes imported expense rows to `Expenses` with:
  - `Date`, `Store / Vendor`, `$ Amount`, `Expense Category`, `Notes`, `Entry Method=Importer`
  - `Store / Vendor` uses `displayNameOverride` when provided; otherwise falls back to normalized/original description.
- Writes imported income rows to `Income` with:
  - `Date`, `Source`, `$ Amount`, `Income Category`, `Notes`, `Entry Method=Importer`
  - `Source` uses `displayNameOverride` when provided; otherwise falls back to normalized/original description.
- Populates metadata columns on writes:
  - `Source Account`, `Original Date`, `Original Amount`, `Original Description`, `Import Fingerprint`, `Imported At`
- Ensures metadata columns exist and auto-hides them.
- Backfills existing blank `Entry Method` values to `Manual` on both tabs.
- Skipped/ignored rows are not written to `Expenses` or `Income`.
- `importBatch` may include `skippedFingerprints`. Those fingerprints are stored on a hidden `Skipped` sheet. Approving a previously skipped fingerprint removes it. `importFingerprints` returns `skippedFingerprints`.

## Files Changed

- `apps-script/Code.gs`
- `apps-script/config.gs`
- `apps-script/sheets.gs`
- `apps-script/dashboard.gs`
- `apps-script/validation.gs`
- `apps-script/import.gs`
- `apps-script/DEPLOYMENT.md`
- `apps-script/HANDOFF.md`

## Test Evidence

- Manual validation only in this workspace (no runnable Apps Script runtime here).
- Contract coverage was checked against:
  - `budgeting-tool-requirements.md`
  - `docs/architecture.md`
  - `docs/api-contract.md`
  - `docs/sheet-contract.md`
  - `docs/data-model.md`
  - `docs/open-decisions.md`
  - `docs/implementation-assumptions.md`
  - `docs/agent-orchestration.md`

## Remaining Risks

- Apps Script runtime behavior (sheet permission/scope) must be verified in bound deployment.
- Header drift in user sheet (renamed columns) will break mapping.
- Action routing requires frontend to send exact action names and request body shape.
