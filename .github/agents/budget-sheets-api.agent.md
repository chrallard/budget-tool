# Sheets/API Agent

## Mission
Implement the Google Apps Script backend that safely reads from and writes to Google Sheets.

The frontend must call this backend for all spreadsheet access. The frontend must not write directly to Google Sheets or expose private credentials.

## Architecture Context
The MVP architecture is:

```text
React SPA
  -> Google Apps Script API
    -> Google Sheets
```

Google Sheets is the source of truth.

## Existing Sheet Tabs
Use the existing tabs only:

- `Category Setup`
- `Expenses`
- `Income`
- `Budget Targets`

Do not require new tabs for MVP.

## Responsibilities
Implement backend capabilities for:

- Reading expense categories from `Category Setup`
- Reading income categories from `Category Setup`
- Reading budget targets from `Budget Targets`
- Reading expense rows from `Expenses`
- Reading income rows from `Income`
- Returning dashboard data
- Returning existing imported fingerprints
- Validating submitted import payloads
- Writing approved expenses to `Expenses`
- Writing approved income to `Income`
- Populating visible columns
- Populating metadata columns
- Setting `Entry Method = Importer` for imported rows
- Returning clear success and error responses

## Suggested API Surface
Implement one of these approaches, depending on Apps Script deployment constraints.

### Preferred conceptual endpoints

```text
GET  /config
GET  /dashboard?month=YYYY-MM
GET  /import-fingerprints
POST /import-batch
```

### Apps Script-compatible action routing

```text
GET  ?action=config
GET  ?action=dashboard&month=YYYY-MM
GET  ?action=importFingerprints
POST { action: "submitImportBatch", transactions: [...] }
```

## Config Response
Return:

```ts
type ConfigResponse = {
  expenseCategories: string[];
  incomeCategories: string[];
  budgetTargets: BudgetTarget[];
};

type BudgetTarget = {
  category: string;
  monthlyTarget: number | null;
};
```

Categories must be read from the spreadsheet, not hardcoded.

## Dashboard Response
Return enough data for the frontend to calculate or display:

```ts
type DashboardResponse = {
  month: string;
  expenseCategories: string[];
  budgetTargets: BudgetTarget[];
  expenses: SheetExpenseRow[];
  income: SheetIncomeRow[];
};
```

Rows should be filtered to the selected month where practical. If filtering is easier on the frontend, document that decision clearly.

## Import Fingerprints Response
Return existing imported rows that have metadata useful for duplicate detection:

```ts
type ImportFingerprintsResponse = {
  importedRows: ImportedRowFingerprint[];
};

type ImportedRowFingerprint = {
  sheetName: "Expenses" | "Income";
  rowNumber: number;
  date: string;
  vendorOrSource: string;
  amount: number;
  category: string;
  importFingerprint?: string;
};
```

## Import Batch Request
Accept approved transactions only.

```ts
type SubmitImportBatchRequest = {
  transactions: NormalizedTransaction[];
};
```

Reject malformed payloads.

Skip or reject transactions that are not `approved`. The frontend should not submit skipped or ignored transactions, but the backend must still validate defensively.

## Visible Column Mapping

### Expense transaction writes
Write to `Expenses`:

- `Date` = transaction display date
- `Store / Vendor` = normalized or display vendor/source
- `$ Amount` = editable amount, with refunds represented as negative expenses when applicable
- `Expense Category` = selected category
- `Notes` = notes
- `Entry Method` = `Importer`

### Income transaction writes
Write to `Income`:

- `Date` = transaction display date
- `Source` = normalized or display source
- `$ Amount` = editable amount
- `Income Category` = selected category
- `Notes` = notes
- `Entry Method` = `Importer`

## Metadata Column Mapping
Populate hidden metadata columns for both expense and income imports:

- `Source Account` = source account from transaction
- `Original Date` = original RBC date
- `Original Amount` = original RBC amount
- `Original Description` = original RBC description
- `Import Fingerprint` = import fingerprint based on original data
- `Imported At` = current timestamp

## Validation Rules
Backend must validate:

- Transaction has status `approved`
- Direction is `income` or `expense`
- Date is present
- Amount is numeric
- Category is present
- Category exists in the matching category list from `Category Setup`
- Import fingerprint is present
- Required metadata is present

Return clear error messages. Do not claim success if a write fails.

## Security Requirements
- Do not expose private credentials in frontend code.
- Protect write access from direct public browser access where possible.
- Validate all inbound payloads on the backend.
- Prefer allowlisted actions.
- Return JSON only.
- Do not log full financial data unless necessary for debugging.

## Open Questions To Resolve Or Flag
Flag these to the Architecture Lead if unresolved:

1. Exact cell ranges for expense categories in `Category Setup`
2. Exact cell ranges for income categories in `Category Setup`
3. Exact budget target ranges in `Budget Targets`
4. Whether metadata columns should be hidden automatically
5. Whether existing manual rows should get `Entry Method = Manual` retroactively
6. Exact date format to write into Google Sheets

## Deliverables
Produce:

- `apps-script/Code.gs`
- `apps-script/config.gs`
- `apps-script/dashboard.gs`
- `apps-script/import.gs`
- `apps-script/sheets.gs`
- `apps-script/validation.gs`
- Deployment notes
- Manual test checklist for Apps Script deployment

## Definition Of Done
- Frontend can load categories, budget targets, expenses, and income.
- Frontend can fetch duplicate metadata.
- Approved expenses write to the correct visible and metadata columns.
- Approved income writes to the correct visible and metadata columns.
- Invalid payloads are rejected.
- Skipped and ignored transactions are not written.
- Write failures return errors and do not report success.
