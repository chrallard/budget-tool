# Implementation Assumptions (MVP Kickoff)

This document defines working assumptions to unblock implementation before all decisions are finalized.

Reference decision register: `docs/open-decisions.md`.

## Assumptions Adopted For Immediate Start

## A-001 Category Range Resolution By Header Lookup

- Decision reference: D-001, D-002
- Assumption: Use fixed ranges from provided sheet layout:
	- Expense categories: `Category Setup!B3:B82`
	- Income categories: `Category Setup!B85:B164`
	- Why this is acceptable for MVP: Matches locked ranges in canonical contracts and avoids implementation drift.
- Dependent agents: budget-sheets-api, budget-integration, budget-import-review-ui, budget-dashboard-ui.
- Proceed status: Proceed.

## A-002 Budget Target Range Resolution By Header Lookup

- Decision reference: D-003
- Assumption: `Budget Targets` is read using fixed section anchors from the current sheet layout:
	- Expense targets: category in `B` + monthly target in `G`, starting row `7`
	- Income targets: category in `B` + monthly target in `G`, starting row `91`
	- Read downward until category cells are blank for each section.
- Why this is acceptable for MVP: This matches the real sheet screenshots and avoids picking up summary/computed blocks.
- Dependent agents: budget-sheets-api, budget-dashboard-ui, budget-integration.
- Proceed status: Proceed.

## A-003 Parser Uses Header Alias Maps Per Account Type

- Decision reference: D-004, D-005
- Assumption: Parser expects exact RBC headers from provided samples:
	- `Account Type`, `Account Number`, `Transaction Date`, `Cheque Number`, `Description 1`, `Description 2`, `CAD$`, `USD$`
	Mapping:
	- `date <- Transaction Date`
	- `description <- Description 1 + Description 2`
	- `amount <- CAD$ OR USD$ - whichever is populated`
	- `sourceAccount <- chequing` when `Account Type = Chequing`
	- `sourceAccount <- credit_card` when `Account Type = Visa`
- Why this is acceptable for MVP: It is now based on real provided CSV exports.
- Dependent agents: budget-data-model-parser, budget-import-review-ui, budget-integration.
- Proceed status: Proceed, with mandatory fixture validation during QA.

## A-004 Date Write Format Is MM-DD-YYYY

- Decision reference: D-006
- Assumption: Backend writes date strings as `MM-DD-YYYY` to both `Expenses` and `Income`.
- Why this is acceptable for MVP: Stable month filtering and easy string matching for dashboard.
- Dependent agents: budget-sheets-api, budget-dashboard-ui, budget-data-model-parser.
- Proceed status: Proceed.

## A-005 Metadata Columns Are Auto-Hidden

- Decision reference: D-007
- Assumption: Metadata columns are created/populated and then auto-hidden by Apps Script.
- Why this is acceptable for MVP: User confirmed this preference and it keeps day-to-day sheet views clean.
- Dependent agents: budget-sheets-api, budget-integration.
- Proceed status: Proceed.

## A-006 Historical Backfill For Entry Method

- Decision reference: D-008
- Assumption: Run one-time backfill on `Expenses` and `Income` to set blank `Entry Method` cells to `Manual`, while keeping imported rows as `Importer`.
- Why this is acceptable for MVP: User approved this behavior and it improves reporting consistency.
- Dependent agents: budget-sheets-api, budget-integration, budget-qa-test.
- Proceed status: Proceed.

## A-007 Ignored Transactions Are Session-Only

- Decision reference: D-009
- Assumption: Ignored transactions are not written to sheets and are not persisted in MVP.
- Why this is acceptable for MVP: Matches no-LocalStorage requirement and current product scope.
- Dependent agents: budget-import-review-ui, budget-integration, budget-qa-test.
- Proceed status: Proceed.

## A-008 Action-Based Apps Script Routing

- Decision reference: D-010
- Assumption: Frontend calls action-based endpoints through single Apps Script URL.
- Why this is acceptable for MVP: Aligns with standard Apps Script deployment pattern.
- Dependent agents: budget-sheets-api, budget-integration, budget-dashboard-ui, budget-import-review-ui.
- Proceed status: Proceed.

## A-014 Same-Origin Transport Adapter For MVP Verification

- Decision reference: D-016
- Assumption: MVP live browser verification uses a same-origin forwarding adapter at `/api/apps-script` when direct browser-to-Apps-Script calls are blocked by CORS or auth redirects.
- Adapter rules:
	- forward-only transport behavior
	- preserve action names: `config`, `dashboard`, `importFingerprints`, `importBatch`
	- preserve request and response schemas from `docs/api-contract.md`
	- preserve owner-only Apps Script authentication model
- Why this is acceptable for MVP: It keeps the required architecture unchanged while giving QA a concrete browser-safe verification path.
- Dependent agents: budget-integration, budget-dashboard-ui, budget-import-review-ui, budget-qa-test.
- Proceed status: Proceed.

## A-009 Authentication Deferred To Deployment Configuration

- Decision reference: D-011
- Assumption: Apps Script web app access is restricted to only the owner's Google account.
- Why this is acceptable for MVP: User explicitly selected private owner-only access.
- Dependent agents: budget-sheets-api, budget-integration, budget-qa-test.
- Proceed status: Proceed.

## A-010 Duplicate Similarity Normalization

- Decision reference: D-012
- Assumption: Similarity uses normalized vendor/source text (uppercase, punctuation stripped, collapsed spaces) with exact or substring token match.
- Why this is acceptable for MVP: Deterministic and testable, with low implementation complexity.
- Dependent agents: budget-data-model-parser, budget-import-review-ui, budget-integration.
- Proceed status: Proceed.

## A-011 Refunds As Negative Expenses

- Decision reference: D-013
- Assumption: Refunds categorized as expense remain in `Expenses` with negative amount and reduce category used budget.
- Why this is acceptable for MVP: Matches requirement examples and dashboard behavior expectations.
- Dependent agents: budget-data-model-parser, budget-import-review-ui, budget-dashboard-ui.
- Proceed status: Proceed.

## A-012 Month Filtering By Parsed MM-DD-YYYY Date

- Decision reference: D-014
- Assumption: Dashboard parses `MM-DD-YYYY` and includes rows whose parsed month/year equals selected month.
- Why this is acceptable for MVP: Keeps filtering consistent with the locked date-write format.
- Dependent agents: budget-dashboard-ui, budget-sheets-api, budget-integration.
- Proceed status: Proceed.

## A-013 Frontend Computes Dashboard Aggregates

- Decision reference: D-015
- Assumption: Backend returns row-level data and targets; frontend computes card and summary totals.
- Why this is acceptable for MVP: Reduces backend surface and keeps formulas visible in UI tests.
- Dependent agents: budget-dashboard-ui, budget-sheets-api, budget-qa-test.
- Proceed status: Proceed.

## Assumption Guardrails

- Canonical contracts take precedence whenever assumptions drift: `docs/architecture.md`, `docs/api-contract.md`, `docs/sheet-contract.md`, and `docs/data-model.md` are authoritative.
- Any assumption that conflicts with real sheet layout or real RBC export files must trigger a contract update proposal before implementation drift.
- `docs/open-decisions.md` remains the source for unresolved choices.
- This document is the source for what teams are allowed to build immediately.

## Current Recommendation

- Implementation readiness: Proceed for development using the assumptions above.
- Release readiness: Proceed, with remaining open behavior decisions tracked in `docs/open-decisions.md`.
