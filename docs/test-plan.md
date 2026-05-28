# MVP QA Test Plan

Date: 2026-05-24
Owner: budget-qa-test
Status: In progress

## Objective

Validate the budgeting MVP against the canonical contracts in `docs/architecture.md`, `docs/api-contract.md`, `docs/sheet-contract.md`, and `docs/data-model.md` before full integration.

## Current Scope Status

- Completed implementation slices under test:
  - Sheets/API backend contract implementation
  - RBC parser and normalization helpers
  - Dashboard UI and calculation helpers
  - Import review UI and review-flow coverage

## Test Strategy

### Unit tests

Parser and normalization:

- Validate chequing and Visa CSV parsing against locked headers.
- Validate expense/income classification by sign.
- Validate refund conversion to negative expense.
- Validate original date, description, amount, and source-account preservation.
- Validate deterministic fingerprint generation from original RBC fields only.
- Validate invalid CSV, empty CSV, invalid amount, invalid date, and no-row error handling.

Duplicate logic:

- Validate exact duplicate detection by fingerprint.
- Validate possible duplicate detection for same date and amount.
- Validate possible duplicate detection for same amount and vendor within plus or minus two days.
- Validate duplicate logic remains based on original imported values when editable amount changes.

Dashboard calculations:

- Validate month filtering using `MM-DD-YYYY` sheet dates.
- Validate remaining budget and progress calculations.
- Validate refunds reduce spending totals.
- Validate over-budget and no-target states.
- Validate monthly spending and income summaries.

### Component tests

Dashboard:

- Validate one card per backend expense category.
- Validate current-month default behavior.
- Validate month selector updates cards and summary values.
- Validate loading and error states.
- Validate mobile layout behavior without horizontal overflow.

Import review:

- Validate one-transaction-at-a-time review behavior.
- Validate approve/skip/ignored transitions.
- Validate category-required approval validation.
- Validate amount/category/notes edits.
- Validate duplicate warning display and actions.
- Validate importBatch payload exclusion for skipped/ignored transactions.

### Integration and backend validation

- Validate Apps Script action routing contract:
  - `config`
  - `dashboard`
  - `importFingerprints`
  - `importBatch`
- Validate payload and response envelopes against `docs/api-contract.md`.
- Validate build/typecheck for completed frontend slices.
- Validate no-LocalStorage and no-credential-leak constraints in frontend source.
- Manual runtime verification remains required for bound Apps Script deployment.

## Current Automated Coverage Inventory

- Parser suite: `src/features/import/parser/__tests__/rbcParser.test.ts`
- Duplicate helper suite: `src/lib/import/__tests__/detectDuplicates.test.ts`
- Dashboard calculation suite: `src/features/dashboard/__tests__/dashboardCalculations.test.ts`
- Dashboard component suite: `src/features/dashboard/__tests__/DashboardPage.test.tsx`
- Import review state suite: `src/features/import/__tests__/reviewState.test.ts`
- Import review component suite: `src/features/import/__tests__/ImportPage.test.tsx`

## Fixture Inventory

Current CSV fixtures in use:

- `src/features/import/parser/__tests__/fixtures/rbc-chequing-valid.csv`
- `src/features/import/parser/__tests__/fixtures/rbc-visa-valid.csv`
- `src/features/import/parser/__tests__/fixtures/rbc-invalid-headers.csv`
- `src/features/import/parser/__tests__/fixtures/rbc-no-transactions.csv`

Additional fixture coverage still needed during import-review and integration QA:

- dedicated refund-only sample
- exact duplicate sample
- possible duplicate within plus or minus two days sample
- invalid non-RBC format sample with realistic noise rows

## Constraint Checks

- Frontend must not persist importer/review state in LocalStorage.
- Frontend must not contain private Google credentials.
- Frontend writes must go through Apps Script API only.
- Imported rows must be validated server-side and written with `Entry Method = Importer`.

## Exit Criteria For QA Handoff

- Parser, duplicate logic, and dashboard calculations have targeted automated coverage.
- Review-flow tests are already present for state and component behavior.
- Build/typecheck issues are either resolved or reported as blockers.
- Contract deviations are documented with reproduction evidence.
- Remaining risks are explicit enough for integration triage.