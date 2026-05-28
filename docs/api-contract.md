# Apps Script API Contract (MVP)

## Overview

The API contract exposes four capabilities:

- `GET /config`
- `GET /dashboard?month=YYYY-MM`
- `GET /import-fingerprints`
- `POST /import-batch`

Because Google Apps Script commonly routes through `doGet` and `doPost`, the implementation may use either:

1. Path routing: `/config`, `/dashboard`, `/import-fingerprints`, `/import-batch`
2. Action routing: `?action=config`, `?action=dashboard&month=YYYY-MM`, `?action=importFingerprints`, and `POST { action: "importBatch", ... }`

Both styles must conform to the same request and response schemas below.

## Transport Note

- The API contract governs actions, payloads, and envelope schemas, not the transport adapter implementation.
- MVP verification path is same-origin through `/api/apps-script` when direct browser calls to Apps Script are blocked by CORS or auth redirects.
- The transport adapter must forward requests to Apps Script without changing action names, request shapes, or response envelope schemas.
- Accepted verification actions remain:
  - `config`
  - `dashboard`
  - `importFingerprints`
  - `importBatch`

## Transport Acceptance Criteria

- No browser CORS or auth-redirect failure for `config`, `dashboard`, `importFingerprints`, and `importBatch` when called through `/api/apps-script`.
- Owner-only Apps Script authentication remains preserved.
- No payload or schema drift is allowed from the request and response contracts below.
- Test evidence must include a passing smoke run through the adapter path.

## Shared Envelope

```ts
export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: {
    requestId?: string;
    generatedAt: string; // ISO timestamp
  };
};

export type ApiError = {
  ok: false;
  error: {
    code:
      | "BAD_REQUEST"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "SHEET_READ_ERROR"
      | "SHEET_WRITE_ERROR"
      | "INTERNAL_ERROR";
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    generatedAt: string; // ISO timestamp
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

## Endpoint: GET /config

Returns app configuration required to run importer and dashboard.

```ts
export type GetConfigResponse = {
  expenseCategories: string[];
  incomeCategories: string[];
  budgetTargets: BudgetTarget[];
  constraints: {
    entryMethodValues: Array<"Manual" | "Importer">;
    sourceOfTruth: "google_sheets";
    localStorageAllowed: false;
    newTabsAllowed: false;
  };
};

export type BudgetTarget = {
  category: string;
  month?: string; // YYYY-MM if sheet stores month-specific targets
  amount: number;
};
```

Response: `ApiResponse<GetConfigResponse>`

## Endpoint: GET /dashboard?month=YYYY-MM

Returns all backend data needed for selected-month dashboard calculations.

```ts
export type GetDashboardRequestQuery = {
  month: string; // YYYY-MM
};

export type DashboardExpenseRow = {
  date: string;
  vendor: string;
  amount: number;
  category: string;
  notes?: string;
  entryMethod?: "Manual" | "Importer";
};

export type DashboardIncomeRow = {
  date: string;
  source: string;
  amount: number;
  category: string;
  notes?: string;
  entryMethod?: "Manual" | "Importer";
};

export type GetDashboardResponse = {
  month: string; // YYYY-MM
  expenseRows: DashboardExpenseRow[];
  incomeRows: DashboardIncomeRow[];
  budgetTargets: BudgetTarget[];
  expenseCategories: string[];
};
```

Response: `ApiResponse<GetDashboardResponse>`

## Endpoint: GET /import-fingerprints

Returns existing imported fingerprint records and duplicate matching candidates.

```ts
export type ImportFingerprintRecord = {
  sheetName: "Expenses" | "Income";
  rowNumber?: number;
  date: string;
  vendorOrSource: string;
  amount: number;
  category: string;
  importFingerprint: string;
  sourceAccount?: "chequing" | "credit_card";
  originalDate?: string;
  originalAmount?: number;
  originalDescription?: string;
};

export type GetImportFingerprintsResponse = {
  records: ImportFingerprintRecord[];
};
```

Response: `ApiResponse<GetImportFingerprintsResponse>`

## Endpoint: POST /import-batch

Consumes approved transactions only. Skipped and ignored transactions must not be submitted.

```ts
export type ImportBatchTransaction = {
  id: string;
  direction: "income" | "expense";
  displayDate: string;
  selectedCategory: string;
  editableAmount: number;
  displayNameOverride?: string;
  notes?: string;
  sourceAccount: "chequing" | "credit_card";
  originalDate: string;
  originalAmount: number;
  originalDescription: string;
  normalizedDescription: string;
  importFingerprint: string;
};

export type PostImportBatchRequest = {
  action?: "importBatch";
  month?: string; // optional contextual month
  approvedTransactions: ImportBatchTransaction[];
};

export type PostImportBatchResponse = {
  written: {
    expenses: number;
    income: number;
  };
  skipped: number; // always 0 for valid payload, included for diagnostics
  ignored: number; // always 0 for valid payload, included for diagnostics
  failures: Array<{
    id: string;
    reason: string;
  }>;
};
```

Response: `ApiResponse<PostImportBatchResponse>`

## Validation Rules

- Reject malformed payloads with `VALIDATION_ERROR`.
- Reject empty `selectedCategory` for any submitted transaction.
- Enforce `editableAmount` numeric and finite.
- Enforce `importFingerprint` presence.
- If `displayNameOverride` is provided, it must be a non-empty string after trimming.
- Enforce `Entry Method = Importer` for all writes.
- Populate metadata columns on write:
  - `Source Account`
  - `Original Date`
  - `Original Amount`
  - `Original Description`
  - `Import Fingerprint`
  - `Imported At`

## Error Handling Expectations

- Frontend must treat `ok: false` as non-success.
- Backend must never return success for partial write failures without reporting `failures`.
- For full write failure, return `SHEET_WRITE_ERROR`.

## Open API Decisions

1. Whether `GET /dashboard` should return pre-aggregated totals in addition to raw rows.

## Locked API Security Decision

- Apps Script deployment access is owner-only (private to the user's Google account) for MVP.

## Locked API Routing Decision

- MVP uses action-based Apps Script routing with `doGet` and `doPost`.
- Actions:
  - `config`
  - `dashboard`
  - `importFingerprints`
  - `importBatch`
