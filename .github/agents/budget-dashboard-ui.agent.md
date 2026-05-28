# Dashboard UI Agent

## Mission
Build the mobile-first dashboard for the budgeting tool.

The dashboard helps the user understand how much spending room remains in each monthly budget category.

## Scope
Own only the dashboard UI and dashboard calculations needed by the UI.

Do not build the CSV importer, transaction review flow, Apps Script backend, or parser.

## Inputs
Consume dashboard data from the frontend API client:

```ts
type DashboardResponse = {
  month: string;
  expenseCategories: string[];
  budgetTargets: BudgetTarget[];
  expenses: SheetExpenseRow[];
  income: SheetIncomeRow[];
};

type BudgetTarget = {
  category: string;
  monthlyTarget: number | null;
};
```

Use mocked data until the real API client is available.

## Responsibilities
Implement:

- Dashboard as the default view
- Current month as the default selected month
- Month selector
- One card per expense category
- Category budget target display
- Used budget display
- Remaining budget display
- Progress indicator
- Over-budget visual state
- No-budget-target state
- Total monthly spending summary
- Total monthly income summary
- Total remaining expense budget summary
- Mobile-friendly layout for iPhone-sized screens
- PWA/home-screen support where applicable

## Calculation Rules

### Category used spending
Sum `Expenses` rows for the selected month and category.

Negative expenses reduce used spending.

Example:

```text
Food expense: 100
Food refund: -20
Used Food spending: 80
```

### Remaining budget

```text
remaining = monthlyTarget - usedSpending
```

### Progress percentage

```text
progress = usedSpending / monthlyTarget * 100
```

Handle missing or zero budget targets safely.

### Total spending
Sum expenses for the selected month.

### Total income
Sum income rows for the selected month.

### Ignored transactions
Ignored transactions should not appear in sheet rows. Do not include any ignored data in dashboard totals.

## UI Requirements

### Category card must show
- Category name
- Total budget
- Used budget
- Remaining budget
- Progress indicator
- Over-budget state when remaining is negative
- No-budget-target message when no target exists

### Month selection
- Default to current month
- Allow selecting a different month
- Update all cards and summaries when month changes

### Mobile-friendly behavior
- Category cards must be readable on an iPhone-sized screen
- No horizontal scrolling
- Large enough tap targets
- Clear spacing
- Dashboard should work well from a home-screen launch

## Suggested Components

```text
src/features/dashboard/DashboardPage.tsx
src/features/dashboard/MonthSelector.tsx
src/features/dashboard/SummaryCards.tsx
src/features/dashboard/CategoryBudgetCard.tsx
src/features/dashboard/BudgetProgress.tsx
src/features/dashboard/dashboardCalculations.ts
src/features/dashboard/types.ts
```

## States To Handle
- Loading dashboard data
- Dashboard load failure
- Budget targets unavailable
- No expenses for selected month
- Category with no budget target
- Over-budget category
- Normal under-budget category

## Error Handling
If budget targets cannot be loaded, show a clear error and avoid misleading calculations.

If dashboard data cannot be loaded, show a clear recovery message and do not show stale or invented data.

## Testing Requirements
Create tests for:

- Default current month
- Month selector changes dashboard data
- One card per expense category
- Remaining budget calculation
- Progress percentage calculation
- Over-budget display
- Negative expenses reducing spending
- No-budget-target display
- Mobile layout does not require horizontal scrolling

## Boundaries
Do not:

- Parse CSV files
- Implement transaction review
- Write to Google Sheets
- Hardcode the definitive category list
- Use LocalStorage for MVP persistence
- Add advanced forecasting or net worth tracking

## Definition Of Done
- Dashboard renders from mocked data.
- Dashboard integrates with the API client when available.
- Category cards are mobile-friendly.
- Calculations match the budgeting rules.
- Errors are clear and non-misleading.
- PWA/home-screen basics are present.
