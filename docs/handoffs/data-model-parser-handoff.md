# Data Model + Parser Handoff

Date: 2026-05-24
Agent: budget-data-model-parser

## 1) Implemented Files

- `src/shared/types/transactions.ts`
- `src/lib/import/types.ts`
- `src/lib/import/formatDates.ts`
- `src/lib/import/normalizeDescription.ts`
- `src/lib/import/suggestIgnoreReason.ts`
- `src/lib/import/suggestCategory.ts`
- `src/lib/import/fingerprintTransaction.ts`
- `src/lib/import/detectRbcCsvType.ts`
- `src/lib/import/detectDuplicates.ts`
- `src/lib/import/normalizeTransaction.ts`
- `src/lib/import/parseRbcCsv.ts`
- `src/features/import/parser/rbcParser.ts`
- `src/features/import/parser/normalize.ts`
- `src/features/import/parser/fingerprint.ts`
- `src/features/import/parser/__tests__/rbcParser.test.ts`
- `src/features/import/parser/__tests__/fixtures/rbc-chequing-valid.csv`
- `src/features/import/parser/__tests__/fixtures/rbc-visa-valid.csv`
- `src/features/import/parser/__tests__/fixtures/rbc-invalid-headers.csv`
- `src/features/import/parser/__tests__/fixtures/rbc-no-transactions.csv`

Additional project update for TypeScript test compatibility:
- `package.json` dev dependency updated to include `@types/node`.

## 2) Completed Scope

- Shared transaction model artifacts aligned to canonical contract.
- RBC CSV parsing for locked headers:
  - `Account Type`, `Account Number`, `Transaction Date`, `Cheque Number`, `Description 1`, `Description 2`, `CAD$`, `USD$`
- Source account detection:
  - `Chequing` -> `chequing`
  - `Visa` -> `credit_card`
- Date normalization:
  - Original date normalized to ISO `YYYY-MM-DD`
  - Display/write date normalized to `MM-DD-YYYY`
- Description normalization:
  - Preserves original description for metadata
  - Normalized description for matching/fingerprint
- Direction and amount classification:
  - Expense/income from sign
  - Refund keywords converted to negative expenses
- Ignore reason suggestion:
  - Internal transfer patterns
  - Credit card payment patterns
- Category suggestion with validation against sheet-loaded category lists.
- Deterministic fingerprint generation using original RBC fields only:
  - `sourceAccount|originalDate|originalAmount|normalizedDescription`
- Duplicate pre-check helpers:
  - Exact fingerprint match -> `confirmed_duplicate`
  - Possible duplicate rules including +/- 2 day window
- Structured parser errors:
  - `EMPTY_CSV`, `INVALID_CSV`, `UNSUPPORTED_RBC_FORMAT`, `MISSING_REQUIRED_COLUMNS`, `NO_VALID_TRANSACTION_ROWS`, `INVALID_AMOUNT`, `INVALID_DATE`

## 3) Deferred / Not Included

- No UI work (dashboard or import review screens).
- No Google Apps Script write logic.
- No LocalStorage/session persistence feature work.

## 4) Exported API Surface

Primary parser and helpers:
- `parseRbcCsv(csvText, options)`
- `detectRbcCsvType(csvRows)`
- `normalizeRbcRowToTransaction(...)`
- `fingerprintTransaction(...)`
- `fingerprintFromNormalizedTransaction(...)`
- `detectDuplicates(...)`
- `suggestCategory(...)`
- `suggestIgnoreReason(...)`
- Date helpers:
  - `parseRbcDateToIso(...)`
  - `formatIsoToMmDdYyyy(...)`
  - `parseAnyDateToIso(...)`

Re-export entry points for feature consumers:
- `src/features/import/parser/rbcParser.ts`
- `src/features/import/parser/normalize.ts`
- `src/features/import/parser/fingerprint.ts`

## 5) Contract Compliance Statement

- Types align with `docs/data-model.md` canonical transaction shape.
- Fingerprint logic uses original RBC values only (not editable amount, category, or notes).
- Date output remains compatible with `MM-DD-YYYY` sheet write contract.
- Duplicate logic aligns with canonical exact + possible duplicate rules.
- Suggested ignore reasons are suggestions only (no auto-ignore status mutation).

## 6) Test Evidence

Executed:
- `npm test -- src/features/import/parser/__tests__/rbcParser.test.ts`

Result:
- 19 tests passed.

Covered behaviors:
- Chequing and Visa parsing
- Expense and income classification
- E-transfer sign handling
- Refund as negative expense
- Internal transfer and credit card payment suggestion
- Fingerprint generation and stability with amount override
- Exact duplicate and possible duplicate detection
- Invalid suggested category handling
- Empty/invalid CSV and amount/date validation errors

## 7) Known Risks / Assumptions

- Refund detection currently uses keyword heuristics (`REFUND`, `REVERSAL`, `RETURN`, `CHARGEBACK`) and may need tuning for real RBC descriptors.
- Possible duplicate similarity is deterministic but may need tuning for false positives/negatives on real vendor strings.
- Full project build currently fails due an existing unrelated dashboard type issue in `src/features/dashboard/dashboardCalculations.ts` (outside parser scope).

## 8) Required Inputs For Next Agents

- Import Review UI should consume parser output from `parseRbcCsv(...)` and rely on pre-populated duplicate metadata.
- Integration agent should wire `existingRecords` from backend `importFingerprints` action into parser options for pre-checking.
- Category arrays passed to parser must come from backend config (`expenseCategories`, `incomeCategories`) to preserve suggestion validation.
