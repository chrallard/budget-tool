# MVP Architecture Contract

## Scope

This document defines the shared implementation contract for the MVP budgeting tool.

Primary flows:

1. RBC and TD CSV to Google Sheets importer
2. Google Sheets to mobile-friendly dashboard

System of record: Google Sheets.

## Required Architecture

```text
React SPA
  -> Google Apps Script API
    -> Google Sheets
```

Transport note for MVP:

- The architecture remains unchanged.
- For browser runtimes where direct cross-origin calls to Apps Script are blocked, the SPA may use a same-origin transport adapter at `/api/apps-script`.
- The transport adapter is forwarding-only and does not change action names, payload schemas, or the logical architecture.

Non-negotiable rules:

- Frontend must not write directly to Google Sheets.
- Approved imported transactions are written through Google Apps Script only.
- Do not add new spreadsheet tabs for MVP.
- Do not use LocalStorage for persistence.

## Component Responsibilities

### React SPA

- Upload and parse RBC or TD CSV files in-browser.
- Normalize CSV rows into `NormalizedTransaction` records.
- Run category suggestion rules.
- Execute duplicate checks using backend-provided imported metadata.
- Drive one-transaction-at-a-time review flow.
- Submit approved transactions in a batch to backend.
- Load and render monthly dashboard data.

### Google Apps Script API

- Provide config reads (categories, budget targets).
- Provide dashboard data by month.
- Provide imported fingerprints and duplicate metadata candidates.
- Validate and write approved import rows to `Expenses` and `Income`.
- Populate metadata columns automatically on import writes.
- Return consistent, typed JSON responses.

### Google Sheets

- Preserve existing tabs: `Category Setup`, `Expenses`, `Income`, `Budget Targets`.
- Preserve required visible columns for `Expenses` and `Income`.
- Allow hidden metadata columns on `Expenses` and `Income`.
- Remain source of truth for categories, budget targets, income, and expenses.

## Contract Governance

- `docs/data-model.md` is the canonical shared TypeScript model contract.
- `docs/api-contract.md` is the canonical frontend-backend API contract.
- `docs/sheet-contract.md` is the canonical Google Sheets mapping contract.
- Other implementation docs and agents must align to these contracts.

## Security And Privacy Constraints

- No private Google credentials in frontend source.
- Sheet writes occur only through backend API.
- Access controls for Apps Script deployment must be enforced in deployment config.

## Transport Acceptance Criteria

- No browser CORS or auth-redirect failure for `config`, `dashboard`, `importFingerprints`, and `importBatch` when using the approved MVP verification path through `/api/apps-script`.
- Owner-only Apps Script authentication remains preserved.
- No request or response schema drift is allowed from `docs/api-contract.md`.
- Test evidence must include a passing adapter-path smoke run.

## MVP Exclusions

- No LocalStorage persistence.
- No machine learning categorization.
- No automatic bank sync.
- No multi-user support.
- No new Category Rules tab.
- No native mobile app.

## Open Questions That Block Full Implementation

1. Exact cell ranges for expense categories in `Category Setup`.
2. Exact cell ranges for income categories in `Category Setup`.
3. Exact cell ranges for category budget targets in `Budget Targets`.
4. Whether metadata columns should be hidden automatically by Apps Script.
5. Whether existing manual rows should get `Entry Method = Manual` retroactively.
6. Exact RBC and TD CSV headers to support for chequing and credit card exports.
7. Exact date format to write into Google Sheets.
8. Whether ignored transactions should be stored anywhere in MVP or simply skipped.
