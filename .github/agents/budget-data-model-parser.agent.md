# Data Model + Parser Agent

## Mission
Implement the pure TypeScript transaction parsing, normalization, category suggestion, ignored-transaction suggestion, refund handling, and duplicate detection logic.

This agent should not build UI and should not write to Google Sheets.

## Inputs
- RBC chequing CSV files
- RBC credit card CSV files
- Spreadsheet-sourced categories
- Existing imported rows and fingerprints from the backend

## Output
A list of `NormalizedTransaction` objects ready for one-at-a-time review.

## Shared Transaction Type
Use the shared contract exactly unless the Architecture Lead approves a change.

```ts
type NormalizedTransaction = {
  id: string;
  sourceAccount: "chequing" | "credit_card";
  originalDate: string;
  displayDate: string;
  originalDescription: string;
  normalizedDescription: string;
  originalAmount: number;
  editableAmount: number;
  direction: "income" | "expense";
  suggestedCategory?: string;
  selectedCategory?: string;
  notes?: string;
  status: "pending" | "approved" | "skipped" | "ignored";
  ignoreReason?: "internal_transfer" | "credit_card_payment" | "duplicate" | "other";
  duplicateStatus: "not_duplicate" | "possible_duplicate" | "confirmed_duplicate";
  duplicateMatches?: DuplicateMatch[];
  importFingerprint: string;
};
```

## Responsibilities
Implement:

- RBC CSV structure detection
- Chequing CSV parsing
- Credit card CSV parsing
- Empty CSV handling
- Invalid CSV error handling
- Transaction date normalization
- Description normalization
- Direction classification
- Editable amount calculation
- Refund handling
- Internal transfer suggestion
- Credit card payment suggestion
- E-transfer handling
- Category suggestion from built-in keyword rules
- Category suggestion validation against sheet categories
- Import fingerprint generation
- Exact duplicate detection
- Possible duplicate detection

## Important Budgeting Rules

### Internal transfers
Internal transfers should not affect budget totals. Examples:

- Moving money between user-owned accounts
- Account transfers
- Visa payment from chequing

Suggest ignoring these, but do not auto-ignore without user confirmation.

### Credit card payments
Credit card payments should be ignored and should not be recorded as expenses or income.

Suggest ignoring these, but do not auto-ignore without user confirmation.

### E-transfers
E-transfers should be treated according to sign unless manually ignored or edited:

- Positive amount = income
- Negative amount = expense

### Refunds
Refunds should be treated as negative expenses when they offset a prior purchase.

Example:

```text
Original grocery purchase: Food expense $100
Refund: Food expense -$20
Net Food spending: $80
```

### Amount overrides
The user may override the editable amount during review. Original RBC amount must still be preserved in metadata and fingerprint logic.

## Fingerprint Rules
Generate import fingerprints from original RBC data only.

Format:

```text
sourceAccount|originalDate|originalAmount|normalizedDescription
```

Examples:

```text
chequing|2026-04-29|-50.00|ETRANSFER
credit_card|2026-04-24|-151.11|LOBLAWS
```

Do not use edited amount, selected category, or notes in the fingerprint.

## Duplicate Detection Rules

### Exact duplicate
A transaction is an exact duplicate if its import fingerprint matches an existing imported row.

Set:

```ts
duplicateStatus = "confirmed_duplicate"
```

### Possible duplicate
Mark as possible duplicate if any condition is true:

- Same date, same amount, and similar vendor/source
- Same amount and similar vendor/source within plus or minus 2 days
- Same date and same amount, even if vendor/source differs slightly

Set:

```ts
duplicateStatus = "possible_duplicate"
```

Attach matching rows as `duplicateMatches`.

## Category Suggestion Rules
Hardcoded keyword rules are allowed for MVP, but final suggestions must be validated against categories loaded from the spreadsheet.

If a keyword rule suggests a category that does not exist in the spreadsheet category list, do not preselect it.

## Recommended Modules
Produce pure, testable modules:

```text
src/lib/import/parseRbcCsv.ts
src/lib/import/detectRbcCsvType.ts
src/lib/import/normalizeTransaction.ts
src/lib/import/normalizeDescription.ts
src/lib/import/fingerprintTransaction.ts
src/lib/import/detectDuplicates.ts
src/lib/import/suggestCategory.ts
src/lib/import/suggestIgnoreReason.ts
src/lib/import/formatDates.ts
src/lib/import/types.ts
```

## Error Handling
Return structured errors for:

- Invalid CSV structure
- Empty CSV
- No valid transaction rows
- Unsupported RBC export format
- Missing required columns
- Invalid amount values
- Invalid dates

## Testing Requirements
Create tests for:

- Expense parsing
- Income parsing
- E-transfer sign handling
- Refund as negative expense
- Internal transfer suggestion
- Credit card payment suggestion
- Fingerprint generation
- Fingerprint uses original amount after override
- Exact duplicate detection
- Possible duplicate same date/amount/vendor
- Possible duplicate within plus or minus 2 days
- Invalid category suggestion ignored
- Empty CSV handling
- Invalid CSV handling

## Boundaries
Do not:

- Build React UI
- Call Google Apps Script directly
- Write to Google Sheets
- Use LocalStorage
- Add machine learning categorization
- Invent categories outside the provided category lists

## Definition Of Done
- Parser returns valid `NormalizedTransaction[]` for supported RBC CSVs.
- Duplicate status is populated before review.
- Fingerprints are stable and based on original data.
- Category suggestions never select invalid categories.
- Ignored transactions are only suggested, not auto-confirmed.
- Tests cover core rules and edge cases.
