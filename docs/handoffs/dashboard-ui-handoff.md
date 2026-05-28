# Dashboard UI Handoff Note

## Scope Completed

Implemented the dashboard UI feature with action-based API compatibility and mock fallback:

- Dashboard default view and current-month default selection
- Month selector that updates all summaries and cards
- Category cards sourced strictly from backend config expense categories
- Budget calculations per contract:
  - used spending by selected month and category
  - refunds (negative expenses) reduce used spending
  - remaining budget = target - used
  - progress = used / target for targets greater than 0
  - missing targets displayed as no-target state
- Summary totals:
  - total monthly spending
  - total monthly income
  - total remaining expense budget
- Loading and clear error states for dashboard/config failures
- Mobile-first layout for iPhone-sized screens with no horizontal scrolling behavior
- PWA/home-screen basics via web manifest and mobile meta tags

## Files Added

- `package.json`
- `index.html`
- `manifest.webmanifest`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `vitest.config.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles.css`
- `src/api/actions.ts`
- `src/api/client.ts`
- `src/test/setup.ts`
- `src/features/dashboard/DashboardPage.tsx`
- `src/features/dashboard/MonthSelector.tsx`
- `src/features/dashboard/SummaryCards.tsx`
- `src/features/dashboard/CategoryBudgetCard.tsx`
- `src/features/dashboard/BudgetProgress.tsx`
- `src/features/dashboard/dashboardCalculations.ts`
- `src/features/dashboard/dashboardDataSource.ts`
- `src/features/dashboard/mockDashboardData.ts`
- `src/features/dashboard/format.ts`
- `src/features/dashboard/types.ts`
- `src/features/dashboard/__tests__/DashboardPage.test.tsx`
- `src/features/dashboard/__tests__/dashboardCalculations.test.ts`

## API Payload Expectations

Dashboard UI currently expects these action-based reads:

- `GET ?action=config`
- `GET ?action=dashboard&month=YYYY-MM`

Envelope expected from both endpoints:

- Success: `{ ok: true, data, meta? }`
- Error: `{ ok: false, error, meta? }`

Config data expectation:

- `expenseCategories: string[]`
- `budgetTargets: Array<{ category: string; amount?: number; monthlyTarget?: number | null; month?: string }>`

Dashboard data expectation:

- `month: string`
- Expense rows accepted as either `expenseRows` or `expenses`
- Income rows accepted as either `incomeRows` or `income`
- `budgetTargets` supported as fallback when config targets are empty

## Integration Notes

- Mock mode is enabled unless `VITE_USE_MOCK_DASHBOARD=false`.
- Real backend mode requires `VITE_APPS_SCRIPT_URL`.
- Category cards are rendered from config `expenseCategories` only, not from row categories.
- Dashboard flow performs read-only API calls and no write operations.

## Test Evidence

Executed:

- `npm test`

Result:

- 3 test files passed
- 30 tests passed
- 0 failed

Coverage focus:

- Default current month behavior
- Month selector and month-scoped calculations
- One card per backend expense category
- Remaining/progress calculations
- Over-budget state
- Refund handling (negative expenses)
- Missing-target display
- Mobile overflow protection

## Known Risks

- Frontend date filtering assumes strict `MM-DD-YYYY`; malformed rows are skipped from month matching.
- The API contract currently allows target shape differences (`amount` vs `monthlyTarget`); adapter handles both, but downstream teams should keep one canonical shape after integration.
- PWA support is baseline-only (manifest + mobile meta); no offline caching strategy has been added in this handoff.
