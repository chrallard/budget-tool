# Import Review UI Agent

## Mission
Build the one-transaction-at-a-time import review flow for RBC CSV transactions.

The review flow should keep cognitive load low by showing a single pending transaction card at a time.

## Scope
Own the import and review UI only.

Use parser modules from the Data Model + Parser Agent. Use backend API client methods from the Sheets/API integration layer.

Do not implement CSV parsing logic inside UI components. Do not write directly to Google Sheets.

## Inputs
- Uploaded RBC CSV file
- Parsed `NormalizedTransaction[]`
- Expense categories from app config
- Income categories from app config
- Existing duplicate metadata from backend

## Shared Transaction Type
Use this shared type from the architecture contract:

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

- CSV upload UI
- Valid CSV success flow
- Invalid CSV error flow
- Empty CSV message
- Source account detection display
- Pending transaction queue
- One transaction card at a time
- Transaction date display
- Vendor/source display
- Amount display and edit field
- Category selector
- Notes field
- Suggested category preselection when valid
- Validation before approval
- Approve transaction
- Skip transaction
- Mark transaction ignored
- Mark internal transfer
- Mark credit card payment
- Duplicate warning display
- Show duplicate match details
- Skip as duplicate
- Import possible duplicate anyway
- Submit approved batch
- Success message after import
- Dashboard refresh after successful import
- Submission error handling
- Preserve current review session in memory while page remains open after submission failure

## Review UX Rules

### One transaction at a time
Show only one pending transaction card at a time.

The card should show:

- Date
- Vendor or source
- Amount
- Selected or suggested category
- Notes
- Duplicate warning, if applicable

### Approval validation
Do not allow approval unless:

- Date is present
- Vendor/source is present
- Amount is valid
- Category is selected
- Category is from the spreadsheet-sourced category list

### Category selector
Expense transactions must only show expense categories loaded from `Category Setup`.

Income transactions must only show income categories loaded from `Category Setup`.

Do not use a hardcoded definitive category list.

### Suggested categories
If a parser-suggested category exists and is valid for the transaction direction, preselect it.

If the suggestion is invalid or missing from the spreadsheet category list, leave the category blank and require manual selection.

### Ignored transactions
Internal transfers and credit card payments may be suggested as ignored, but the user must confirm.

Ignored transactions are not submitted to the backend.

### Skipped transactions
Skipped transactions are not submitted to the backend.

### Duplicates
For possible duplicates, show:

- Incoming transaction
- Matching existing row details
- Match reason

Actions:

- Skip as duplicate
- Import anyway
- Edit transaction
- Mark ignored

Confirmed duplicates should strongly encourage skipping, but the user experience should still be clear and recoverable.

## Submit Batch Rules
Only submit transactions with:

```ts
status === "approved"
```

Do not submit:

- pending transactions
- skipped transactions
- ignored transactions

On success:

- Show success message
- Refresh dashboard data
- Clear completed import state

On failure:

- Show error message
- Do not claim success
- Preserve review session in memory while page remains open

## Suggested Components

```text
src/features/import/ImportPage.tsx
src/features/import/CsvUpload.tsx
src/features/import/TransactionReviewCard.tsx
src/features/import/CategorySelector.tsx
src/features/import/DuplicateWarning.tsx
src/features/import/IgnoreActions.tsx
src/features/import/ImportProgress.tsx
src/features/import/SubmitImportBatchButton.tsx
src/features/import/reviewState.ts
```

## State Management
Use in-memory React state for MVP.

Do not rely on LocalStorage for persistence.

## Error States
Handle:

- Cannot load categories
- Cannot load duplicate metadata
- Invalid CSV
- Empty CSV
- Parser failure
- Missing category validation
- Backend submission failure

## Testing Requirements
Create tests for:

- Upload valid chequing CSV
- Upload valid credit card CSV
- Invalid CSV error
- Empty CSV message
- One transaction shown at a time
- Approval blocked without category
- Amount override updates editable amount
- Original amount remains unchanged
- Notes editing
- Skip transaction
- Mark ignored
- Duplicate warning
- Skip as duplicate
- Import possible duplicate anyway
- Submit approved only
- Submission failure preserves session

## Boundaries
Do not:

- Implement parser internals
- Write directly to Google Sheets
- Expose Google credentials
- Use LocalStorage
- Add complex split transactions
- Add automatic bank sync

## Definition Of Done
- User can upload supported RBC CSVs.
- User reviews one transaction at a time.
- User can approve, skip, ignore, edit amount, edit notes, and change category.
- Duplicate warnings are visible and actionable.
- Only approved transactions are submitted.
- Submission errors are handled safely.
