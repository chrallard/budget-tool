# Shared Data Model Contract (MVP)

## Canonical TypeScript Types

These types are the shared contract across frontend and backend integration surfaces.

```ts
export type SourceAccount = "chequing" | "credit_card";

export type TransactionDirection = "income" | "expense";

export type TransactionStatus = "pending" | "approved" | "skipped" | "ignored";

export type IgnoreReason =
  | "internal_transfer"
  | "credit_card_payment"
  | "duplicate"
  | "other";

export type DuplicateStatus = "not_duplicate" | "possible_duplicate" | "confirmed_duplicate";

export type NormalizedTransaction = {
  id: string;
  sourceAccount: SourceAccount;
  originalDate: string;
  displayDate: string;
  originalDescription: string;
  normalizedDescription: string;
  displayNameOverride?: string;
  originalAmount: number;
  editableAmount: number;
  direction: TransactionDirection;
  suggestedCategory?: string;
  selectedCategory?: string;
  notes?: string;
  status: TransactionStatus;
  ignoreReason?: IgnoreReason;
  duplicateStatus: DuplicateStatus;
  duplicateMatches?: DuplicateMatch[];
  importFingerprint: string;
};

export type DuplicateMatch = {
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

## App Config Types

```ts
export type BudgetTarget = {
  category: string;
  month?: string; // YYYY-MM when month-specific
  amount: number;
};

export type AppConfig = {
  expenseCategories: string[];
  incomeCategories: string[];
  budgetTargets: BudgetTarget[];
};
```

## Review State Machine Contract

Valid transitions:

```text
pending -> approved
pending -> skipped
pending -> ignored
pending -> pending (after edits)
approved -> pending (if reopened before submission)
```

Rules:

- `skipped` and `ignored` are terminal for batch submission and are excluded from payload.
- `approved` may be reopened to `pending` only before batch submit.
- Category must be selected before `pending -> approved`.

## Duplicate Detection Contract

### Import fingerprint

```text
sourceAccount|originalDate|originalAmount|normalizedDescription
```

Rules:

- Fingerprint uses original RBC fields, not edited budget values.
- The importer applies the same fingerprint contract to TD CSV imports after normalization.
- `originalAmount` remains unchanged even when `editableAmount` is overridden.

### Exact duplicate

- Match when fingerprint equals an existing imported fingerprint.
- Result: `duplicateStatus = "confirmed_duplicate"`.

### Possible duplicate

Match when one is true:

1. Same date, same amount, and similar vendor/source.
2. Same amount and similar vendor/source within plus or minus 2 days.
3. Same date and same amount, even if vendor/source differs slightly.

Result: `duplicateStatus = "possible_duplicate"` with `duplicateMatches` populated.

## Dashboard Calculation Contract

```ts
export type CategoryCard = {
  category: string;
  budgetTarget?: number; // undefined means no target set
  used: number;
  remaining?: number; // undefined when budgetTarget is undefined
  progressPct?: number; // undefined when budgetTarget is undefined or 0
  isOverBudget: boolean;
};

export type DashboardSummary = {
  month: string; // YYYY-MM
  totalSpending: number;
  totalIncome: number;
  profit: number;
};
```

Rules:

- Default month is current month when none is selected.
- Category cards are shown for expense categories from `Category Setup`.
- Spending is computed from `Expenses` rows in selected month.
- Income is computed from `Income` rows in selected month.
- Refunds are negative expenses and reduce category spending.
- Ignored transactions are not written to sheets and therefore not counted.
- `remaining = budgetTarget - used`.
- `progressPct = used / budgetTarget` when `budgetTarget > 0`.
- Missing target is treated as no target, not a zero-budget failure.
- Stored transaction dates use `MM-DD-YYYY` for sheet writes and dashboard filtering.

## Import Batch Data Contract

```ts
export type ApprovedImportTransaction = {
  id: string;
  direction: TransactionDirection;
  displayDate: string;
  selectedCategory: string;
  editableAmount: number;
  displayNameOverride?: string;
  notes?: string;
  sourceAccount: SourceAccount;
  originalDate: string;
  originalAmount: number;
  originalDescription: string;
  normalizedDescription: string;
  importFingerprint: string;
};

export type ImportBatch = {
  approvedTransactions: ApprovedImportTransaction[];
};
```

## Open Data-Model Decisions

1. Exact vendor/source normalization rule set used before fingerprinting.
2. Whether ignored items should exist only in in-memory session state (default) or in a persisted audit trail.
