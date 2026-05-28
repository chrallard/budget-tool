# Integration Report

Date: 2026-05-25
Agent: budget-integration
Recommendation: Blocked-pending-contract-decision

Addendum (2026-05-27):

- Import review now supports optional display-name override for final sheet writes.
- Contract docs were updated to include optional `displayNameOverride` in import payloads.

## Scope executed

Integrated frontend and backend contracts for:

- config loading
- dashboard loading
- import review context loading
- duplicate metadata integration
- approved-batch submission
- dashboard refresh after successful import

Shared contract documentation has since been updated for optional display-name override behavior.

## Fixed integration defects

1. Clear error separation for read paths.
- Updated dashboard data source to distinguish config/targets load failures from dashboard-row load failures.
- Updated import data source to distinguish config/category failures from duplicate-metadata failures.

2. Added integration smoke coverage.
- Added test coverage for action routing and basic end-to-end wiring behavior in `src/integration/__tests__/integration-smoke.test.ts`.

## Contract alignment verification

Verified aligned contracts across frontend and Apps Script for:

- action routing names: `config`, `dashboard`, `importFingerprints`, `importBatch`
- API envelope shape: `{ ok, data/error, meta }`
- approved import payload shape and required fields
- duplicate record shape used by parser/review flow
- dashboard calculation source data shape
- sheet write mapping and metadata behavior

Contract gap discovered during live deployment verification:

- Direct browser calls from localhost to Apps Script deployment are blocked by CORS with a 302 redirect response path.
- Formal CCR submitted: `docs/contract-change-requests/CCR-20260525-apps-script-cors.md`.

## Test evidence

Targeted local validation run:

- `npm run build`
- `npm test -- src/integration/__tests__/integration-smoke.test.ts`
- `npm test -- src/features/import/parser/__tests__/rbcParser.test.ts src/features/dashboard/__tests__/dashboardCalculations.test.ts src/lib/import/__tests__/detectDuplicates.test.ts src/features/import/__tests__/reviewState.test.ts src/features/import/__tests__/ImportPage.test.tsx`

Result target for this integration pass: pass.

Observed result:

- Build passed.
- 6 test files passed.
- 52 tests passed.
- 0 failed.

## Remaining risks

1. Direct localhost browser-to-Apps Script flow currently blocked by CORS/auth redirect behavior.
2. Sheet header drift in real spreadsheet can still break mapping.
3. Duplicate similarity heuristics may need tuning on real transaction samples.

## Release readiness

Status: Blocked pending Architecture Lead decision on CCR.

Release readiness conditions:

1. Architecture Lead reviews and resolves CCR `CCR-20260525-apps-script-cors`.
2. Implement approved transport approach (direct call if viable, or proxy/same-origin alternative).
3. Re-run live deployment smoke sequence and complete checklist closure.

If all conditions pass, MVP can be marked release-ready under current known-risk profile.
