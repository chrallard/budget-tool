# Import Review UI Handoff

Date: 2026-05-24
Agent: budget-import-review-ui

## 1) Implemented Files

- `src/api/client.ts`
- `src/App.tsx`
- `src/styles.css`
- `src/features/import/importDataSource.ts`
- `src/features/import/CsvUpload.tsx`
- `src/features/import/CategorySelector.tsx`
- `src/features/import/DuplicateWarning.tsx`
- `src/features/import/IgnoreActions.tsx`
- `src/features/import/ImportProgress.tsx`
- `src/features/import/SubmitImportBatchButton.tsx`
- `src/features/import/TransactionReviewCard.tsx`
- `src/features/import/ImportPage.tsx`
- `src/features/import/reviewState.ts`
- `src/features/import/__tests__/reviewState.test.ts`
- `src/features/import/__tests__/ImportPage.test.tsx`
- `src/lib/import/normalizeTransaction.ts`

## 2) Completed Scope

- Built an import review page that parses uploaded RBC CSV files using `parseRbcCsv(...)`.
- Loads expense/income categories and existing fingerprint records from the action-based API layer through an import data source.
- Shows exactly one pending transaction card at a time.
- Supports amount edits, category selection, notes editing, approve, skip, and ignore actions.
- Supports display-name override edits for final `Store / Vendor` (expense) and `Source` (income) writes.
- Enforces approval validation:
  - date present
  - vendor/source present
  - amount finite and non-zero
  - selected category present and valid for transaction direction
- Surfaces duplicate warnings, duplicate match details, and duplicate actions.
- Excludes skipped and ignored transactions from the `importBatch` payload.
- Submits approved rows only.
- Preserves the review session on submission failure while the page remains open.
- Clears review state after successful submission and triggers a dashboard refresh path through the app shell.
- Added mock import data source support for local frontend work when Apps Script is not wired.

## 3) Payload Creation / Integration Notes

- Import review relies on backend-provided category arrays and fingerprint metadata from:
  - `GET ?action=config`
  - `GET ?action=importFingerprints`
- Approved payloads are created from `status === "approved"` only and sent as:
  - `POST { action: "importBatch", month?, approvedTransactions }`
- Payload fields match the contract shape:
  - `id`
  - `direction`
  - `displayDate`
  - `selectedCategory`
  - `editableAmount`
  - `displayNameOverride?`
  - `notes?`
  - `sourceAccount`
  - `originalDate`
  - `originalAmount`
  - `originalDescription`
  - `normalizedDescription`
  - `importFingerprint`

## 4) Contract Compliance Statement

- Review flow consumes parser outputs without redefining shared transaction types.
- Suggested categories are only preselected when valid against backend-loaded category lists.
- Duplicate warnings are derived from backend fingerprint metadata passed into parser duplicate checks.
- Ignored and skipped rows never enter the approved batch payload.
- No LocalStorage persistence was introduced.
- No backend Apps Script internals or contract docs were changed.

## 5) Test Evidence

Executed:
- `npx vitest run src/features/import/__tests__/reviewState.test.ts src/features/import/__tests__/ImportPage.test.tsx`
- `npm run build`

Result:
- 18 focused import-review tests passed.
- Production build passed.

Covered behaviors:
- Valid chequing CSV upload
- Valid credit card CSV upload
- Invalid CSV error handling
- Empty CSV error handling
- One-transaction-at-a-time review queue
- Approval blocked without valid category
- Amount override updates editable amount only
- Display-name override updates the final submitted name only
- Notes editing
- Skip and ignore actions
- Duplicate warning display
- Skip as duplicate
- Import possible duplicate anyway
- Submit approved rows only
- Submission failure preserves review session

## 6) Assumptions / Residual Risks

- The app shell now exposes dashboard and import-review views with in-memory navigation only; no router was introduced.
- Mock import mode is enabled unless `VITE_USE_MOCK_IMPORT=false`.
- Successful import triggers a dashboard remount for refresh, but full backend data visibility still depends on real Apps Script wiring.

## 7) Required Inputs For Next Agent

- Integration should use the real Apps Script URL with `VITE_USE_MOCK_IMPORT=false` and `VITE_APPS_SCRIPT_URL` set.
- QA can target the import page via `ImportPage` with stubbed data sources for deterministic flow validation.
- Integration should confirm live Apps Script responses for `config`, `importFingerprints`, and `importBatch` match the current frontend expectations.