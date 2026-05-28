# Agent Orchestration Plan

## Purpose

This document coordinates MVP implementation across specialized agents while preserving shared contracts.

Scope authority:

- Contract owner: Architecture Lead
- Contract sources:
  - `docs/architecture.md`
  - `docs/api-contract.md`
  - `docs/sheet-contract.md`
  - `docs/data-model.md`
  - `docs/open-decisions.md`
  - `docs/implementation-assumptions.md`

Non-negotiable constraints:

- React SPA -> Google Apps Script API -> Google Sheets
- Google Sheets is source of truth
- Preserve existing sheet tabs
- No new tabs for MVP
- No LocalStorage persistence
- No private Google credentials in frontend
- Imported rows must set `Entry Method = Importer`

## 1) Agent Execution Order

1. Sheets/API Agent
2. Data Model + Parser Agent
3. Dashboard UI Agent
4. Import Review UI Agent
5. QA/Test Agent
6. Integration Agent

Current status as of 2026-05-25:

- Completed: Sheets/API Agent
- Completed: Data Model + Parser Agent
- Completed: Dashboard UI Agent
- Completed: Import Review UI Agent
- Completed: QA/Test Agent (recommendation: Go-with-known-risks)
- Integration Agent: implementation complete (conditionally ready for release)
- Next active: live Apps Script deployment verification

Execution gates:

- Gate A: Sheets/API and Data Model/Parser may start in parallel.
- Gate B: Dashboard UI may proceed with mocked API data before backend is complete.
- Gate C: Import Review UI starts only after parser contracts/types are implemented.
- Gate D: QA creates test plan early, full validation after core modules exist.
- Gate E: Integration runs last.

Gate status as of 2026-05-25:

- Gate A: complete
- Gate B: complete
- Gate C: complete
- Gate D: complete
- Gate E: in progress (pending live deployment smoke verification)

## 2) Parallelization Plan

Wave 1 (parallel):

- Sheets/API Agent
- Data Model + Parser Agent

Status: complete

Wave 2 (partially parallel):

- Dashboard UI Agent (can use mocks) - complete
- Import Review UI Agent (wait for parser outputs, then proceed) - complete

Status: complete

Wave 3:

- QA/Test Agent test plan early, then full run on integrated modules

Status: complete (Go-with-known-risks)

Wave 4:

- Integration Agent (final wiring and end-to-end checks)

Status: in progress (implementation complete, live deployment verification pending)

## 3) Exact Prompt For Each Agent

Use these prompts exactly, then append repo-specific context if needed.

### 3.1 Sheets/API Agent Prompt

```text
You are the Sheets/API agent for the budgeting MVP.

Read and follow exactly:
- budgeting-tool-requirements.md
- docs/architecture.md
- docs/api-contract.md
- docs/sheet-contract.md
- docs/data-model.md
- docs/open-decisions.md
- docs/implementation-assumptions.md

Your scope only:
- Implement Google Apps Script read/write API behavior and sheet mapping logic.
- Use action-based routing: config, dashboard, importFingerprints, importBatch.
- Enforce owner-only deployment assumptions in code comments/config guidance.
- Implement sheet reads/writes per contracts, including metadata and Entry Method rules.

Do not:
- Change shared contract docs.
- Implement frontend UI.
- Add spreadsheet tabs.

If a contract gap is discovered:
- Stop and propose a contract change to Architecture Lead with: issue, impact, proposed change.

Deliverables:
- Backend Apps Script files (adapt to existing repo structure).
- Brief handoff note listing implemented endpoints, validation rules, and known risks.
- File list and test evidence (manual or automated).
```

### 3.2 Data Model + Parser Agent Prompt

```text
You are the Data Model + Parser agent for the budgeting MVP.

Read and follow exactly:
- budgeting-tool-requirements.md
- docs/architecture.md
- docs/api-contract.md
- docs/data-model.md
- docs/open-decisions.md
- docs/implementation-assumptions.md

Your scope only:
- Implement shared TypeScript data model artifacts used by frontend modules.
- Implement RBC CSV parser for chequing and credit card using locked headers.
- Implement normalization, direction classification, fingerprint creation, and duplicate pre-check helpers.
- Respect MM-DD-YYYY output date format requirements.

Do not:
- Change shared contract docs.
- Implement dashboard or review UI screens.

If a contract gap is discovered:
- Stop and propose contract change to Architecture Lead.

Deliverables:
- Typed model/parsing modules and parser tests/fixtures.
- Handoff note: exported types, parser API, edge cases, unresolved risks.
```

### 3.3 Dashboard UI Agent Prompt

```text
You are the Dashboard UI agent for the budgeting MVP.

Read and follow exactly:
- budgeting-tool-requirements.md
- docs/architecture.md
- docs/api-contract.md
- docs/sheet-contract.md
- docs/data-model.md
- docs/open-decisions.md
- docs/implementation-assumptions.md

Your scope only:
- Implement dashboard view and month selector.
- Render category cards from expense categories.
- Apply dashboard calculations exactly per contract.
- Use mocked API data if backend is not ready.

Do not:
- Change shared contract docs.
- Implement CSV parsing/import review workflow.

If a contract gap is discovered:
- Stop and propose contract change to Architecture Lead.

Deliverables:
- Dashboard UI components, state/selectors, and calculation utilities.
- Handoff note: required API payload shape, fallback behavior, test notes.
```

### 3.4 Import Review UI Agent Prompt

```text
You are the Import Review UI agent for the budgeting MVP.

Read and follow exactly:
- budgeting-tool-requirements.md
- docs/architecture.md
- docs/api-contract.md
- docs/sheet-contract.md
- docs/data-model.md
- docs/open-decisions.md
- docs/implementation-assumptions.md

Precondition:
- Start only after parser/data-model modules are available.

Your scope only:
- Build one-transaction-at-a-time review flow.
- Support approve, skip, ignored, and editable fields.
- Enforce category-required approval rules.
- Surface duplicate warnings and actions.
- Ensure ignored transactions are skipped (not persisted).

Do not:
- Change shared contract docs.
- Implement backend endpoint internals.

If a contract gap is discovered:
- Stop and propose contract change to Architecture Lead.

Deliverables:
- Review UI components/state/actions.
- Handoff note: parser dependencies, payload creation for importBatch, risks.
```

### 3.5 QA/Test Agent Prompt

```text
You are the QA/Test agent for the budgeting MVP.

Read and follow exactly:
- budgeting-tool-requirements.md
- docs/architecture.md
- docs/api-contract.md
- docs/sheet-contract.md
- docs/data-model.md
- docs/build-plan.md
- docs/open-decisions.md
- docs/implementation-assumptions.md

Your scope only:
- Produce and maintain test plan early (before full integration).
- Add/execute tests for parser, backend contracts, dashboard calculations, and review flow.
- Verify MVP constraints are respected.

Do not:
- Change shared contract docs.
- Introduce new product behavior.

If a contract gap is discovered:
- Stop and propose contract change to Architecture Lead.

Deliverables:
- Test plan document and test suite updates.
- Failure report by severity with reproduction steps.
- Go/no-go recommendation for integration phase.
```

### 3.6 Integration Agent Prompt

```text
You are the Integration agent for the budgeting MVP.

Read and follow exactly:
- budgeting-tool-requirements.md
- docs/architecture.md
- docs/api-contract.md
- docs/sheet-contract.md
- docs/data-model.md
- docs/build-plan.md
- docs/open-decisions.md
- docs/implementation-assumptions.md

Precondition:
- Run after Sheets/API, Parser, Dashboard UI, Import Review UI, and QA outputs exist.

Your scope only:
- Wire frontend modules to backend endpoints.
- Ensure action routing contract compatibility.
- Resolve integration defects without changing shared contracts.
- Produce end-to-end verification summary.

Do not:
- Change shared contract docs without approval.

If a contract gap is discovered:
- Stop and submit formal contract change request.

Deliverables:
- Integrated flow across config, dashboard, import review, dedupe, and import batch.
- Integration report: fixed issues, remaining risks, release readiness.
```

## 4) Expected Files From Each Agent

Note: adapt paths to existing repo structure if files already exist elsewhere.

Sheets/API Agent expected files:

- `apps-script/Code.gs` (or equivalent Apps Script source)
- `apps-script/appsscript.json`
- `apps-script/README.md` deployment/run notes

Data Model + Parser Agent expected files:

- `src/shared/types/transactions.ts`
- `src/features/import/parser/rbcParser.ts`
- `src/features/import/parser/normalize.ts`
- `src/features/import/parser/fingerprint.ts`
- `src/features/import/parser/__tests__/rbcParser.test.ts`

Dashboard UI Agent expected files:

- `src/features/dashboard/DashboardPage.tsx`
- `src/features/dashboard/components/CategoryCard.tsx`
- `src/features/dashboard/calculations.ts`
- `src/features/dashboard/__tests__/calculations.test.ts`

Import Review UI Agent expected files:

- `src/features/import-review/ImportReviewPage.tsx`
- `src/features/import-review/state/reviewReducer.ts`
- `src/features/import-review/components/TransactionCard.tsx`
- `src/features/import-review/__tests__/reviewReducer.test.ts`

QA/Test Agent expected files:

- `docs/test-plan.md`
- `docs/test-report.md`
- Additional test files in feature-local test folders

Integration Agent expected files:

- `src/api/client.ts`
- `src/api/actions.ts`
- `src/integration/__tests__/integration-smoke.test.ts`
- `docs/integration-report.md`

## 5) Handoff Checklist Between Agents

Every handoff must include:

1. Implemented file list
2. What was completed vs deferred
3. Contract compliance statement
4. Test evidence (what ran, pass/fail)
5. Known risks and assumptions
6. Required inputs for next agent
7. Explicit note if any contract change is requested

## 6) Contract-Change Process

No agent may silently change:

- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/sheet-contract.md`
- `docs/data-model.md`
- `docs/open-decisions.md`
- `docs/implementation-assumptions.md`

Required process:

1. Agent creates a Contract Change Request (CCR) note in `docs/contract-change-requests/CCR-YYYYMMDD-<topic>.md`
2. CCR must contain:
   - current contract excerpt
   - problem and impact
   - proposed change
   - affected modules/agents
   - migration/backward-compatibility notes
3. Architecture Lead reviews and either approves or rejects.
4. Only Architecture Lead updates contract docs.
5. After update, downstream agents rebase to new contract.

## 7) MVP Readiness Checklist

Architecture and security:

- Frontend writes only through Apps Script API
- Owner-only Apps Script access configured
- No private credentials in frontend

Sheet integrity:

- Existing tabs preserved (`Category Setup`, `Expenses`, `Income`, `Budget Targets`)
- No new tabs introduced
- Imported rows set `Entry Method = Importer`
- Metadata populated and auto-hidden
- Blank existing Entry Method backfilled to `Manual`

Functional completeness:

- Config endpoint returns categories and targets
- Dashboard endpoint returns selected-month data
- Fingerprints endpoint returns duplicate metadata
- Import batch endpoint validates and writes expenses/income only for approved rows
- Parser supports locked RBC headers for chequing and Visa credit card exports
- Duplicate status logic present (confirmed + possible)
- Review flow supports approve/skip/ignored/edit
- Ignored transactions skipped and not persisted
- Dashboard month filtering and card calculations match contracts

Quality:

- QA plan executed against core modules
- Integration smoke flow passes
- Remaining risks documented and accepted

## 8) Immediate Next Step Prompts

Use these prompts as-is for the next wave now that the Sheets/API handoff is complete.

### 8.1 Kickoff Prompt: Data Model + Parser Agent

```text
You are the budget-data-model-parser agent for the budgeting MVP.

Current state:
- Sheets/API step is complete.
- Backend actions implemented: config, dashboard, importFingerprints, importBatch.
- Sheet category ranges are locked to Category Setup!B3:B82 (expense) and Category Setup!B85:B164 (income).

Read and follow exactly:
- budgeting-tool-requirements.md
- docs/architecture.md
- docs/api-contract.md
- docs/data-model.md
- docs/open-decisions.md
- docs/implementation-assumptions.md
- docs/agent-orchestration.md
- apps-script/HANDOFF.md

Your scope only:
- Implement shared TypeScript model artifacts for importer/review/dashboard integration.
- Implement RBC CSV parser for chequing and Visa credit card exports using locked headers.
- Implement normalization helpers and deterministic fingerprint generation using:
  sourceAccount|originalDate|originalAmount|normalizedDescription
- Implement duplicate pre-check helpers aligned to canonical duplicate rules.
- Ensure display/write date behavior remains compatible with MM-DD-YYYY sheet write contract.

Do not:
- Change contract docs.
- Implement dashboard or import-review UI screens.
- Add LocalStorage persistence.

If a contract gap is found:
- Stop and submit a Contract Change Request per docs/agent-orchestration.md section 6.

Deliverables:
- Source modules for shared types/parser/normalize/fingerprint/duplicate helpers.
- Parser fixtures/tests covering chequing and Visa samples, invalid headers, and amount/date edge cases.
- Handoff note with exported APIs, assumptions, and residual risks.

Acceptance checks before handoff:
- Types align with docs/data-model.md.
- Fingerprint logic uses original RBC fields only.
- Parser output is sufficient for import-review payload creation and duplicate checks.
```

### 8.2 Kickoff Prompt: Dashboard UI Agent (Parallel)

```text
You are the budget-dashboard-ui agent for the budgeting MVP.

Current state:
- Sheets/API step is complete with action-based routing.
- You may proceed in parallel with parser work using mocked data when needed.

Read and follow exactly:
- budgeting-tool-requirements.md
- docs/architecture.md
- docs/api-contract.md
- docs/sheet-contract.md
- docs/data-model.md
- docs/open-decisions.md
- docs/implementation-assumptions.md
- docs/agent-orchestration.md
- apps-script/HANDOFF.md

Your scope only:
- Implement dashboard view and month selector with current month default.
- Render category cards from expense categories loaded from backend config.
- Implement dashboard calculations exactly per contract:
  - used spending from Expenses rows for selected month
  - income totals from Income rows for selected month
  - refunds as negative expenses reducing spend
  - missing target shown as no target (not zero-budget failure)
  - remaining = target - used
  - progress = used / target when target > 0
- Integrate action-based API client calls where practical; use mock adapters until full integration if needed.

Do not:
- Change contract docs.
- Implement CSV parse/import-review workflow.
- Add LocalStorage persistence.

If a contract gap is found:
- Stop and submit a Contract Change Request per docs/agent-orchestration.md section 6.

Deliverables:
- Dashboard page/components/calculation utilities.
- Tests for calculations and month filtering behavior.
- Handoff note with API payload expectations and known risks.

Acceptance checks before handoff:
- Dashboard behavior matches contracts for refunds, missing targets, and month scoping.
- Category cards render from backend-provided expense categories only.
- No write operations occur from dashboard flow.
```

### 8.3 Status After Wave 4

- `budget-data-model-parser` completed the 8.1 kickoff scope.
- `budget-dashboard-ui` completed the 8.2 kickoff scope.
- `budget-import-review-ui` completed the 8.4 kickoff scope.
- `budget-qa-test` completed validation with recommendation: Go-with-known-risks.
- `budget-integration` completed code wiring, tests, and integration report artifacts.
- Final release gate is now live Apps Script deployment verification.

### 8.4 Kickoff Prompt: Import Review UI Agent

```text
You are the budget-import-review-ui agent for the budgeting MVP.

Current state:
- Sheets/API step is complete with action-based routing.
- budget-data-model-parser has completed shared types, parser, normalization, fingerprint, and duplicate helper outputs, including `parseRbcCsv(...)` and duplicate pre-check helpers.
- budget-dashboard-ui has completed dashboard UI/calculation work and established the frontend action-based API client shape.
- Import Review UI may now start because parser/data-model preconditions are satisfied.

Read and follow exactly:
- budgeting-tool-requirements.md
- docs/architecture.md
- docs/api-contract.md
- docs/sheet-contract.md
- docs/data-model.md
- docs/open-decisions.md
- docs/implementation-assumptions.md
- docs/agent-orchestration.md
- apps-script/HANDOFF.md

Your scope only:
- Build the one-transaction-at-a-time import review flow.
- Consume parser/type outputs without changing shared contracts.
- Use `parseRbcCsv(...)` output as the transaction-review input model.
- Rely on backend-provided duplicate metadata for review warnings and actions.
- Use category arrays from backend config to preserve parser/category suggestion validation.
- Support approve, skip, ignored, and editable fields.
- Enforce category-required approval rules before a transaction can be approved.
- Surface duplicate warnings, duplicate details, and available user actions.
- Produce importBatch-ready payloads for approved rows only.
- Ensure ignored and skipped transactions are not persisted.

Do not:
- Change contract docs.
- Implement backend endpoint internals.
- Add LocalStorage persistence.

If a contract gap is found:
- Stop and submit a Contract Change Request per docs/agent-orchestration.md section 6.

Deliverables:
- Review UI components/state/actions.
- Tests for review reducer/state transitions and approval validation rules.
- Handoff note with parser dependencies, payload creation details for importBatch, assumptions, and residual risks.

Acceptance checks before handoff:
- Review flow consumes parser outputs without redefining shared types.
- Review flow uses backend config categories and pre-populated duplicate metadata instead of local category definitions.
- Approval requires a valid category where the contract requires one.
- Ignored and skipped transactions are excluded from the importBatch payload.
- Duplicate warnings/actions align with canonical duplicate rules.
```

### 8.5 Kickoff Prompt: QA/Test Agent

```text
You are the budget-qa-test agent for the budgeting MVP.

Current state:
- Sheets/API, budget-data-model-parser, and budget-dashboard-ui steps are complete.
- Parser handoff reports the targeted parser test suite passed.
- Dashboard UI handoff reports `npm test` passed for the current frontend test suite.
- budget-import-review-ui is the next feature slice starting now.

Read and follow exactly:
- budgeting-tool-requirements.md
- docs/architecture.md
- docs/api-contract.md
- docs/sheet-contract.md
- docs/data-model.md
- docs/build-plan.md
- docs/open-decisions.md
- docs/implementation-assumptions.md
- docs/agent-orchestration.md
- apps-script/HANDOFF.md

Your scope only:
- Produce and maintain the test plan before full integration.
- Validate completed parser and dashboard outputs against shared contracts.
- Add or execute tests for parser behavior, duplicate logic, dashboard calculations, and the upcoming review flow.
- Run typecheck/build-oriented validation where available, especially around dashboard calculation types and other integration-critical contracts.
- Verify MVP constraints remain respected across completed modules.
- Prepare a failure report and go/no-go view for the integration phase as implementation progresses.

Do not:
- Change shared contract docs.
- Introduce new product behavior.

If a contract gap is discovered:
- Stop and submit a Contract Change Request per docs/agent-orchestration.md section 6.

Deliverables:
- docs/test-plan.md
- docs/test-report.md
- Additional test-suite updates needed for parser, dashboard, and review-flow coverage.
- Failure report by severity with reproduction steps and a go/no-go recommendation for integration.

Acceptance checks before handoff:
- Test plan covers parser, backend contract behavior, dashboard calculations, and review flow.
- Any failures are tied to contract requirements or explicit MVP constraints.
- Test reporting distinguishes passing targeted suites from unresolved type/build issues, if any remain.
- Remaining risks are documented clearly for the integration phase.
```

### 8.6 Next Start Guidance

1. Run the live Apps Script deployment smoke checks in `deployment-notes.md` with mocks disabled:
  - `VITE_USE_MOCK_DASHBOARD=false`
  - `VITE_USE_MOCK_IMPORT=false`
  - `VITE_APPS_SCRIPT_URL` set to the deployed web app URL
2. Close remaining unchecked items in `integration-checklist.md`.
3. Record outcomes and residual issues in `integration-report.md`.
4. If all live checks pass, mark release readiness as complete.
