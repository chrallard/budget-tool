import type {
  BudgetTarget,
  CategoryCardData,
  DashboardSummary,
  ExpenseRow,
  IncomeRow,
} from "./types";

const PREFERRED_CATEGORY_ORDER: readonly string[] = [
  "Other",
  "Food out",
  "Food",
  "Coffee out",
  "Coffee in",
  "Gas",
  "Home",
  "Entertainment",
  "Gifts",
  "Clothing",
  "Donations",
];

function sortCategoriesForDashboard(expenseCategories: string[]): string[] {
  const priorityByCategory = new Map<string, number>();
  for (let i = 0; i < PREFERRED_CATEGORY_ORDER.length; i += 1) {
    priorityByCategory.set(PREFERRED_CATEGORY_ORDER[i], i);
  }

  return expenseCategories
    .map((category, index) => ({
      category,
      index,
      priority: priorityByCategory.get(category),
    }))
    .sort((a, b) => {
      const aHasPriority = a.priority !== undefined;
      const bHasPriority = b.priority !== undefined;

      if (aHasPriority && bHasPriority) {
        return (a.priority as number) - (b.priority as number);
      }

      if (aHasPriority) {
        return -1;
      }

      if (bHasPriority) {
        return 1;
      }

      return a.index - b.index;
    })
    .map((item) => item.category);
}

export function getCurrentMonth(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function parseSheetDateToMonth(date: string): string | undefined {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date);
  if (!match) {
    return undefined;
  }

  const [, mm, , yyyy] = match;
  return `${yyyy}-${mm}`;
}

export function filterExpensesByMonth(expenses: ExpenseRow[], month: string): ExpenseRow[] {
  return expenses.filter((row) => parseSheetDateToMonth(row.date) === month);
}

export function filterIncomeByMonth(income: IncomeRow[], month: string): IncomeRow[] {
  return income.filter((row) => parseSheetDateToMonth(row.date) === month);
}

function getCategoryTarget(
  budgetTargets: BudgetTarget[],
  category: string,
  month: string,
): number | undefined {
  const exactMonth = budgetTargets.find((target) => target.category === category && target.month === month);
  if (exactMonth?.monthlyTarget !== undefined) {
    return exactMonth.monthlyTarget;
  }

  const generic = budgetTargets.find((target) => target.category === category && !target.month);
  return generic?.monthlyTarget;
}

export function calculateCategoryCards(
  expenseCategories: string[],
  budgetTargets: BudgetTarget[],
  expenses: ExpenseRow[],
  month: string,
): CategoryCardData[] {
  const monthExpenses = filterExpensesByMonth(expenses, month);
  const orderedCategories = sortCategoriesForDashboard(expenseCategories);

  return orderedCategories.map((category) => {
    const used = monthExpenses
      .filter((row) => row.category === category)
      .reduce((sum, row) => sum + row.amount, 0);

    const budgetTarget = getCategoryTarget(budgetTargets, category, month);
    const remaining = budgetTarget === undefined ? undefined : budgetTarget - used;
    const progressPct = budgetTarget && budgetTarget > 0 ? (used / budgetTarget) * 100 : undefined;

    const isOverBudget = remaining === undefined ? false : remaining < 0;

    return {
      category,
      budgetTarget,
      used,
      remaining,
      progressPct,
      isOverBudget,
    };
  });
}

export function calculateDashboardSummary(
  month: string,
  expenses: ExpenseRow[],
  income: IncomeRow[],
  cards: CategoryCardData[],
): DashboardSummary {
  const totalSpending = filterExpensesByMonth(expenses, month).reduce((sum, row) => sum + row.amount, 0);
  const totalIncome = filterIncomeByMonth(income, month).reduce((sum, row) => sum + row.amount, 0);
  const profit = totalIncome - totalSpending;

  return {
    month,
    totalSpending,
    totalIncome,
    profit,
  };
}

export function collectAvailableMonths(expenses: ExpenseRow[], income: IncomeRow[], fallbackMonth: string): string[] {
  const months = new Set<string>([fallbackMonth]);

  for (const row of expenses) {
    const month = parseSheetDateToMonth(row.date);
    if (month) {
      months.add(month);
    }
  }

  for (const row of income) {
    const month = parseSheetDateToMonth(row.date);
    if (month) {
      months.add(month);
    }
  }

  return Array.from(months).sort((a, b) => b.localeCompare(a));
}
