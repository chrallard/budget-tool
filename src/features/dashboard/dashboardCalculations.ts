import type {
  Allotment,
  BudgetTarget,
  CategoryCardData,
  DashboardSummary,
  ExpenseRow,
  IncomeRow,
} from "./types";

export function getCurrentMonth(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function previousMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function meaningfulProfit(actualProfit: number, fundedByEarlierProfit: number): number {
  return actualProfit + fundedByEarlierProfit;
}

export function stillFree(toWorkWith: number, allotments: Allotment[]): number {
  const planned = allotments.reduce((sum, allotment) => sum + allotment.amount, 0);
  return toWorkWith - planned;
}

export function linkedExpensesForMonth(
  allotments: Allotment[],
  expenses: ExpenseRow[],
  spendingMonth: string,
): ExpenseRow[] {
  const expenseById = new Map(
    expenses.filter((expense) => expense.id).map((expense) => [expense.id as string, expense]),
  );
  const seen = new Set<string>();
  const linked: ExpenseRow[] = [];

  for (const allotment of allotments) {
    for (const expenseId of allotment.expenseIds) {
      if (seen.has(expenseId)) {
        continue;
      }

      const expense = expenseById.get(expenseId);
      if (!expense || expense.category !== allotment.category) {
        continue;
      }

      if (parseSheetDateToMonth(expense.date) !== spendingMonth) {
        continue;
      }

      seen.add(expenseId);
      linked.push(expense);
    }
  }

  return linked;
}

export function fundedExpenseTotal(allotments: Allotment[], expenses: ExpenseRow[], spendingMonth: string): number {
  return linkedExpensesForMonth(allotments, expenses, spendingMonth).reduce((sum, expense) => sum + expense.amount, 0);
}

export function calculateMonthProfit(month: string, expenses: ExpenseRow[], income: IncomeRow[]): number {
  const totalSpending = filterExpensesByMonth(expenses, month).reduce((sum, row) => sum + row.amount, 0);
  const totalIncome = filterIncomeByMonth(income, month).reduce((sum, row) => sum + row.amount, 0);
  return totalIncome - totalSpending;
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

  return expenseCategories
    .map((category) => {
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
    })
    .sort((a, b) => {
      if (b.used !== a.used) {
        return b.used - a.used;
      }

      return a.category.localeCompare(b.category);
    });
}

export function calculateDashboardSummary(
  month: string,
  expenses: ExpenseRow[],
  income: IncomeRow[],
): DashboardSummary {
  const totalSpending = filterExpensesByMonth(expenses, month).reduce((sum, row) => sum + row.amount, 0);
  const totalIncome = filterIncomeByMonth(income, month).reduce((sum, row) => sum + row.amount, 0);
  const profit = calculateMonthProfit(month, expenses, income);

  return {
    month,
    totalSpending,
    totalIncome,
    profit,
  };
}

export function calculateAllotmentSummary(
  month: string,
  expenses: ExpenseRow[],
  income: IncomeRow[],
  allotments: Allotment[],
): DashboardSummary {
  const actual = calculateDashboardSummary(month, expenses, income);
  const funded = fundedExpenseTotal(allotments, expenses, month);
  const totalSpending = actual.totalSpending - funded;

  return {
    month,
    totalSpending,
    totalIncome: actual.totalIncome,
    profit: actual.totalIncome - totalSpending,
  };
}

export function calculateAllotmentCategoryCards(
  expenseCategories: string[],
  budgetTargets: BudgetTarget[],
  expenses: ExpenseRow[],
  month: string,
  allotments: Allotment[],
): CategoryCardData[] {
  const fundedByCategory = new Map<string, number>();
  for (const expense of linkedExpensesForMonth(allotments, expenses, month)) {
    fundedByCategory.set(expense.category, (fundedByCategory.get(expense.category) ?? 0) + expense.amount);
  }

  return calculateCategoryCards(expenseCategories, budgetTargets, expenses, month)
    .map((card) => {
      const funded = fundedByCategory.get(card.category) ?? 0;
      if (funded === 0) {
        return card;
      }

      const used = card.used - funded;
      const remaining = card.budgetTarget === undefined ? undefined : card.budgetTarget - used;
      const progressPct = card.budgetTarget && card.budgetTarget > 0 ? (used / card.budgetTarget) * 100 : undefined;

      return {
        ...card,
        used,
        remaining,
        progressPct,
        isOverBudget: remaining === undefined ? false : remaining < 0,
      };
    })
    .sort((left, right) => {
      if (right.used !== left.used) {
        return right.used - left.used;
      }

      return left.category.localeCompare(right.category);
    });
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
