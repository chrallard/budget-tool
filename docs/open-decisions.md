# Open Decisions Register (Pre-Implementation)

This register consolidates unresolved choices that can block or materially change backend, parser, dashboard, and import behavior.

Status key:

- Resolved: confirmed by user and locked for MVP.
- Blocking: should be finalized before related implementation is considered stable.
- Proceed with default: implementation can begin using the recommended MVP default.

## D-001 Expense Category Range In Category Setup

Status: Resolved

1. Decision needed: Exact sheet range used to read expense categories.
2. Why it matters: Backend config endpoint and frontend category selectors depend on deterministic category reads.
3. Recommended default for MVP: Use fixed range `Category Setup!B3:B82` (from screenshot label "Expense Categories (up to 80)" and start row 3).
4. Which agent depends on it: budget-sheets-api, budget-integration, budget-import-review-ui, budget-dashboard-ui, budget-qa-test.
5. Can implementation proceed with default: Yes (Resolved).

## D-002 Income Category Range In Category Setup

Status: Resolved with implementation default

1. Decision needed: Exact sheet range used to read income categories.
2. Why it matters: Income transaction review and validation require an authoritative category list.
3. Recommended default for MVP: Use fixed range `Category Setup!B85:B164` (based on sheet note: income starts row 85, up to 80 items).
4. Which agent depends on it: budget-sheets-api, budget-integration, budget-import-review-ui, budget-qa-test.
5. Can implementation proceed with default: Yes (Resolved with default from provided screenshot).

## D-003 Budget Target Range In Budget Targets

Status: Resolved with section-based mapping

1. Decision needed: Exact range and column mapping for category budget targets.
2. Why it matters: Dashboard remaining and progress calculations are invalid without reliable target reads.
3. Recommended default for MVP: Use section-based mapping from provided `Budget Targets` layout:
	 - Expense section:
		 - categories in column `B`, starting at row `7`
		 - monthly target in column `G`, same row
		 - read until category cells become empty
	 - Income section:
		 - categories in column `B`, starting at row `91`
		 - monthly target in column `G`, same row
		 - read until category cells become empty
	 - Ignore implied annual columns and computed summary blocks.
4. Which agent depends on it: budget-sheets-api, budget-dashboard-ui, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Resolved).

## D-004 RBC Chequing CSV Header Contract

Status: Resolved

1. Decision needed: Exact accepted headers and aliases for chequing export parsing.
2. Why it matters: Parser validity, source account detection, and parse error behavior depend on strict header recognition.
3. Recommended default for MVP: Use exact headers from provided sample CSV:
	- `Account Type`
	- `Account Number`
	- `Transaction Date`
	- `Cheque Number`
	- `Description 1`
	- `Description 2`
	- `CAD$`
	- `USD$`
	Parse mapping:
	- `date <- Transaction Date`
	- `description <- Description 1 + " " + Description 2` (trim)
	- `amount <- CAD$`
	- `sourceAccount <- chequing` when `Account Type = Chequing`
4. Which agent depends on it: budget-data-model-parser, budget-import-review-ui, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Resolved).

## D-005 RBC Credit Card CSV Header Contract

Status: Resolved

1. Decision needed: Exact accepted headers and aliases for credit card export parsing.
2. Why it matters: Credit card rows often use different header names and amount sign conventions than chequing.
3. Recommended default for MVP: Use same exact header row as chequing sample and detect credit card via `Account Type = Visa`:
	- `Account Type`
	- `Account Number`
	- `Transaction Date`
	- `Cheque Number`
	- `Description 1`
	- `Description 2`
	- `CAD$`
	- `USD$`
	Parse mapping:
	- `date <- Transaction Date`
	- `description <- Description 1 + " " + Description 2` (trim)
	- `amount <- CAD$`
	- `sourceAccount <- credit_card` when `Account Type = Visa`
4. Which agent depends on it: budget-data-model-parser, budget-import-review-ui, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Resolved).

## D-006 Sheet Date Write Format

Status: Resolved

1. Decision needed: Exact date format written to `Expenses` and `Income` `Date` columns.
2. Why it matters: Month filtering correctness and dashboard totals depend on consistent parseable dates.
3. Recommended default for MVP: Write strict `MM-DD-YYYY`.
4. Which agent depends on it: budget-sheets-api, budget-dashboard-ui, budget-data-model-parser, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Resolved).

## D-007 Auto-Hide Metadata Columns In Apps Script

Status: Resolved

1. Decision needed: Whether backend should automatically hide metadata columns after creation.
2. Why it matters: Affects spreadsheet UX and operator expectations, but not core data integrity.
3. Recommended default for MVP: Yes, Apps Script should auto-hide metadata columns.
4. Which agent depends on it: budget-sheets-api, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Resolved).

## D-008 Backfill Old Rows With Entry Method = Manual

Status: Resolved

1. Decision needed: Whether to retroactively update existing rows.
2. Why it matters: Backfill can be disruptive and may alter historical sheets; importer logic only requires imported rows to be marked `Importer`.
3. Recommended default for MVP: Yes, backfill existing rows so blank `Entry Method` values become `Manual`.
4. Which agent depends on it: budget-sheets-api, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Resolved).

## D-009 Ignored Transaction Persistence

Status: Resolved

1. Decision needed: Whether ignored transactions are persisted anywhere in MVP.
2. Why it matters: Impacts auditability and review-session restart behavior.
3. Recommended default for MVP: Ignored transactions are skipped (not written to `Expenses` or `Income`) and not persisted in MVP.
4. Which agent depends on it: budget-import-review-ui, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Resolved).

## D-010 Apps Script Endpoint Shape

Status: Resolved

1. Decision needed: Path-based routes vs action-parameter routing through `doGet` and `doPost`.
2. Why it matters: Frontend API client and Apps Script router implementation must match exactly.
3. Recommended default for MVP: Use action-parameter routing (`?action=config`, `?action=dashboard`, `?action=importFingerprints`, `POST action=importBatch`) for maximum Apps Script compatibility.
4. Which agent depends on it: budget-sheets-api, budget-integration, budget-dashboard-ui, budget-import-review-ui.
5. Can implementation proceed with default: Yes (Resolved).

## D-011 Apps Script Authentication Strategy

Status: Resolved

1. Decision needed: How API access is constrained in deployed Apps Script.
2. Why it matters: Security requirement forbids exposing private credentials and requires safe backend write access.
3. Recommended default for MVP: Restrict web app deployment to only the owner Google account (private access).
4. Which agent depends on it: budget-sheets-api, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Resolved).

## D-012 Duplicate Similarity Behavior

1. Decision needed: Exact algorithm for vendor/source similarity and date-window matching.
2. Why it matters: False positives and false negatives directly affect import review trust and dedupe safety.
3. Recommended default for MVP: Normalize vendor text to uppercase alphanumeric tokens, strip punctuation/extra whitespace, then mark similar when normalized strings are equal or one contains the other; apply the defined plus or minus 2 day window.
4. Which agent depends on it: budget-data-model-parser, budget-import-review-ui, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Proceed with default), but tune using real transaction samples.

## D-013 Refund Handling Rule

1. Decision needed: Canonical rule to classify and write refunds.
2. Why it matters: Refund treatment changes category spending and remaining budget values.
3. Recommended default for MVP: Refunds categorized as expenses are written to `Expenses` with negative amount and count toward expense category totals as negative spend.
4. Which agent depends on it: budget-data-model-parser, budget-import-review-ui, budget-dashboard-ui, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Proceed with default).

## D-014 Month Filtering And Time Boundary Rules

Status: Resolved with updated date format

1. Decision needed: Exact month inclusion logic for dashboard calculations.
2. Why it matters: Date parsing ambiguity can place transactions in wrong months.
3. Recommended default for MVP: Parse stored `MM-DD-YYYY` date and include rows whose parsed year/month equals selected month.
4. Which agent depends on it: budget-dashboard-ui, budget-sheets-api, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Resolved).

## D-015 Dashboard Aggregation Responsibility

1. Decision needed: Whether backend should also return pre-aggregated totals in addition to raw rows.
2. Why it matters: Impacts API design, frontend complexity, and potential logic duplication.
3. Recommended default for MVP: Return raw rows and targets only; frontend computes cards and summary using shared formulas.
4. Which agent depends on it: budget-dashboard-ui, budget-sheets-api, budget-integration, budget-qa-test.
5. Can implementation proceed with default: Yes (Proceed with default).

## D-016 Browser Transport Path For Apps Script Runtime Calls

Status: Resolved

1. Decision needed: How browser runtime calls should reach Apps Script when direct cross-origin calls are blocked by CORS or auth redirects.
2. Why it matters: Live MVP verification cannot complete if the browser cannot read `config`, `dashboard`, `importFingerprints`, or `importBatch` responses.
3. Decision for MVP: Keep architecture unchanged and use a same-origin forwarding transport adapter at `/api/apps-script` as the approved verification path.
4. Constraints preserved:
	- logical architecture remains `React SPA -> Google Apps Script API -> Google Sheets`
	- owner-only Apps Script auth remains in place
	- no action-name change
	- no request or response schema change
5. Which agent depends on it: budget-integration, budget-dashboard-ui, budget-import-review-ui, budget-qa-test.
6. Can implementation proceed with decision: Yes (Resolved).

## Decision Summary

- Total open decisions tracked: 16
- Resolved by user input: D-001, D-002, D-003, D-004, D-005, D-006, D-007, D-008, D-009, D-010, D-011, D-014
- Resolved by architecture ruling: D-016
- Still open: D-012, D-013, D-015
- No current hard blocker for implementation kickoff.
