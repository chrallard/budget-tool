# MVP Build Plan

## Objective

Deliver the MVP budgeting tool with architecture:

```text
React SPA -> Google Apps Script API -> Google Sheets
```

Constraints:

- No new spreadsheet tabs.
- No LocalStorage persistence.
- Google Sheets remains source of truth.

## Phase Plan

## Phase 1: Contract Finalization

Deliverables:

- Finalize `docs/architecture.md`.
- Finalize `docs/api-contract.md`.
- Finalize `docs/sheet-contract.md`.
- Finalize `docs/data-model.md`.

Exit criteria:

- Frontend and backend agents accept shared contracts.
- Open questions logged with owners.

## Phase 2: Backend Read Endpoints

Scope:

- Implement config read endpoint.
- Implement dashboard read endpoint.
- Implement import fingerprints read endpoint.

Exit criteria:

- `GET /config` returns categories and targets.
- `GET /dashboard?month=YYYY-MM` returns month-scoped rows and targets.
- `GET /import-fingerprints` returns imported metadata records.

## Phase 3: Dashboard UI (Read Only)

Scope:

- Build mobile-first dashboard default view.
- Add month selector.
- Render category cards and summary totals using backend data.

Exit criteria:

- Current month loads by default.
- Category cards show used, remaining, progress, and no-target state.
- Refunds reduce spending totals.

## Phase 4: CSV Parse + Review Workflow

Scope:

- Upload RBC chequing and credit card CSV files.
- Parse to `NormalizedTransaction`.
- One-at-a-time review UI.
- Category suggestions (hardcoded rules allowed).
- Status transitions and validation.

Exit criteria:

- User can approve, skip, ignore, edit amount/category/notes.
- Invalid or unsupported CSV surfaces clear error.
- Category selection restricted to loaded sheet categories.

## Phase 5: Duplicate Detection

Scope:

- Generate fingerprints from original RBC data.
- Match exact and possible duplicates.
- Present duplicate warnings with match details.

Exit criteria:

- Exact duplicates flagged as confirmed.
- Possible duplicates flagged using canonical rule set.
- User can skip, import anyway, edit, or ignore.

## Phase 6: Import Batch Writes

Scope:

- Submit approved transactions only.
- Write expense and income rows with metadata.
- Handle write failures with accurate UX state.

Exit criteria:

- Written rows contain visible columns and metadata columns.
- `Entry Method` set to `Importer` for imported rows.
- Skipped and ignored transactions are not written.

## Phase 7: QA and Release Readiness

Scope:

- Validate Gherkin scenarios against implemented behavior.
- Validate mobile layout and PWA basics.
- Confirm security constraints and credential handling.

Exit criteria:

- MVP include-list is complete.
- MVP exclude-list remains out of scope.

## Blocking Open Questions

1. Exact category ranges in `Category Setup` (expense and income).
2. Exact budget-target range in `Budget Targets`.
3. RBC chequing and credit card CSV header variants to support.
4. Final date format for sheet writes.
5. Automatic metadata-column hiding behavior in Apps Script.
6. Whether to backfill existing rows with `Entry Method = Manual`.
7. Whether ignored transactions are stored anywhere beyond in-memory review state.

## Decision Log Template

Use this template as decisions are finalized:

```text
Decision ID:
Date:
Owner:
Question:
Decision:
Reason:
Impacted contracts:
```

## Contract-First Rule

Any team discovering mismatch or ambiguity must propose a contract update before changing behavior.
