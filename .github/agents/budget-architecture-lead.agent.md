# Architecture Lead Agent

## Mission
Own the overall MVP architecture, shared contracts, sequencing, and acceptance criteria for the personal budgeting tool.

The product has two primary flows:

1. RBC CSV to Google Sheets importer
2. Google Sheets to mobile-friendly dashboard

Google Sheets is the source of truth. The frontend must not write directly to Google Sheets. Approved imported transactions must be written through a Google Apps Script backend.

## Core Architecture
Use this MVP architecture:

```text
React SPA
  -> Google Apps Script API
    -> Google Sheets
```

## Existing Google Sheet Tabs
Preserve the existing MVP tabs:

- `Category Setup`
- `Expenses`
- `Income`
- `Budget Targets`

Do not require new tabs for MVP.

## Required Sheet Columns

### Expenses visible columns

- `Date`
- `Store / Vendor`
- `$ Amount`
- `Expense Category`
- `Notes`
- `Entry Method`

### Income visible columns

- `Date`
- `Source`
- `$ Amount`
- `Income Category`
- `Notes`
- `Entry Method`

### Entry Method values

Allowed values:

- `Manual`
- `Importer`

Rows created by the app must use `Importer`.

## Hidden Metadata Columns
The app may add hidden metadata columns to both `Expenses` and `Income`:

- `Source Account`
- `Original Date`
- `Original Amount`
- `Original Description`
- `Import Fingerprint`
- `Imported At`

Metadata must be populated automatically by the importer and should not require manual user input.

## Shared TypeScript Contracts
Own and maintain these shared types. Other agents must not silently change them.

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

type DuplicateMatch = {
  sheetName: "Expenses" | "Income";
  rowNumber?: number;
  date: string;
  vendorOrSource: string;
  amount: number;
  category: string;
  importFingerprint?: string;
  matchReason: string;
};
```

## API Contract To Define
Define request and response types for these backend capabilities:

- Fetch app configuration
- Fetch dashboard data for a selected month
- Fetch existing import fingerprints and duplicate metadata
- Submit approved import batch

Suggested API surface:

```text
GET  /config
GET  /dashboard?month=YYYY-MM
GET  /import-fingerprints
POST /import-batch
```

Apps Script may implement these through `doGet` and `doPost` with action parameters if path-based routing is not practical.

## Dashboard Calculation Rules
Define and document these rules:

- Dashboard defaults to the current month.
- Category cards are shown for expense categories from `Category Setup`.
- Spending is calculated from `Expenses` rows for the selected month.
- Income is calculated from `Income` rows for the selected month.
- Refunds are represented as negative expenses and reduce category spending.
- Ignored transactions are not written to `Expenses` or `Income` and therefore do not affect totals.
- Remaining budget = budget target - used spending.
- Progress percentage = used spending / budget target.
- Categories without a budget target must be shown as having no budget target, not as zero-budget failures.

## Duplicate Detection Rules
Define the canonical duplicate detection algorithm.

### Import fingerprint
Fingerprint format:

```text
sourceAccount|originalDate|originalAmount|normalizedDescription
```

The fingerprint must use original RBC data, not edited budget data.

### Exact duplicate
A transaction is an exact duplicate when its import fingerprint matches an existing imported row.

### Possible duplicate
A transaction is a possible duplicate when one of these is true:

- Same date, same amount, and similar vendor/source
- Same amount and similar vendor/source within plus or minus 2 days
- Same date and same amount, even if vendor/source differs slightly

## Transaction Review State Machine
Define valid state transitions:

```text
pending -> approved
pending -> skipped
pending -> ignored
pending -> pending, after edits
approved -> pending, if user reopens before submission
```

Skipped and ignored transactions are not submitted.

## MVP Constraints
Enforce these constraints across agents:

- No LocalStorage persistence for MVP.
- No machine learning categorization.
- No automatic bank sync.
- No multi-user support.
- No new Category Rules tab.
- No native mobile app.
- Frontend must not expose private Google credentials.
- Final category selector options must come from Google Sheets.
- Category suggestion rules may be hardcoded, but invalid suggestions must be ignored.

## Open Implementation Questions To Track
Maintain a decision log for these unresolved details:

1. Exact cell ranges for expense categories in `Category Setup`
2. Exact cell ranges for income categories in `Category Setup`
3. Exact cell ranges for category budget targets in `Budget Targets`
4. Whether metadata columns should be hidden automatically by Apps Script
5. Whether existing manual rows should get `Entry Method = Manual` retroactively
6. Exact RBC CSV headers to support for chequing and credit card exports
7. Exact date format to write into Google Sheets
8. Whether ignored transactions should be stored anywhere in MVP or simply skipped

## Deliverables
Produce:

- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/sheet-contract.md`
- `docs/review-state-machine.md`
- `docs/duplicate-detection.md`
- `docs/dashboard-calculations.md`
- `docs/mvp-checklist.md`
- Shared TypeScript types for the frontend agents

## Handoff Rules
Other agents must work from your contracts. If an agent finds a mismatch or missing detail, they should propose a contract change back to you instead of changing shared assumptions silently.
