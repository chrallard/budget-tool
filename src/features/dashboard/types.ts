export type BudgetTarget = {
  category: string;
  monthlyTarget?: number;
  month?: string;
};

export type ExpenseRow = {
  date: string;
  amount: number;
  category: string;
  vendor?: string;
  notes?: string;
};

export type IncomeRow = {
  date: string;
  amount: number;
  category: string;
  source?: string;
  notes?: string;
};

export type DashboardData = {
  month: string;
  availableMonths?: string[];
  expenseCategories: string[];
  budgetTargets: BudgetTarget[];
  expenses: ExpenseRow[];
  income: IncomeRow[];
};

export type CategoryCardData = {
  category: string;
  budgetTarget?: number;
  used: number;
  remaining?: number;
  progressPct?: number;
  isOverBudget: boolean;
};

export type DashboardSummary = {
  month: string;
  totalSpending: number;
  totalIncome: number;
  profit: number;
};
