import { describe, expect, it } from "vitest";
import {
  calculateCategoryCards,
  calculateDashboardSummary,
  filterExpensesByMonth,
} from "../dashboardCalculations";
import type { BudgetTarget, ExpenseRow, IncomeRow } from "../types";

describe("dashboard calculations", () => {
  const expenseCategories = ["Food", "Rent", "Pets"];
  const budgetTargets: BudgetTarget[] = [
    { category: "Food", monthlyTarget: 500 },
    { category: "Rent", monthlyTarget: 1800 },
  ];

  const expenses: ExpenseRow[] = [
    { date: "05-01-2026", category: "Food", amount: 100 },
    { date: "05-03-2026", category: "Food", amount: -20 },
    { date: "05-02-2026", category: "Rent", amount: 1850 },
    { date: "04-28-2026", category: "Food", amount: 999 },
  ];

  const income: IncomeRow[] = [
    { date: "05-01-2026", category: "Salary", amount: 3200 },
    { date: "04-01-2026", category: "Salary", amount: 3200 },
  ];

  it("filters expenses by month using MM-DD-YYYY", () => {
    const result = filterExpensesByMonth(expenses, "2026-05");
    expect(result).toHaveLength(3);
  });

  it("treats refunds as negative expenses that reduce used spending", () => {
    const cards = calculateCategoryCards(expenseCategories, budgetTargets, expenses, "2026-05");
    const food = cards.find((card) => card.category === "Food");

    expect(food?.used).toBe(80);
    expect(food?.remaining).toBe(420);
  });

  it("computes progress percentage when target is greater than zero", () => {
    const cards = calculateCategoryCards(expenseCategories, budgetTargets, expenses, "2026-05");
    const food = cards.find((card) => card.category === "Food");

    expect(food?.progressPct).toBe(16);
  });

  it("shows over-budget state when remaining is negative", () => {
    const cards = calculateCategoryCards(expenseCategories, budgetTargets, expenses, "2026-05");
    const rent = cards.find((card) => card.category === "Rent");

    expect(rent?.remaining).toBe(-50);
    expect(rent?.isOverBudget).toBe(true);
  });

  it("keeps missing targets as no-target state", () => {
    const cards = calculateCategoryCards(expenseCategories, budgetTargets, expenses, "2026-05");
    const pets = cards.find((card) => card.category === "Pets");

    expect(pets?.budgetTarget).toBeUndefined();
    expect(pets?.remaining).toBeUndefined();
    expect(pets?.progressPct).toBeUndefined();
  });

  it("builds summary totals for selected month only", () => {
    const cards = calculateCategoryCards(expenseCategories, budgetTargets, expenses, "2026-05");
    const summary = calculateDashboardSummary("2026-05", expenses, income, cards);

    expect(summary.totalSpending).toBe(1930);
    expect(summary.totalIncome).toBe(3200);
    expect(summary.profit).toBe(1270);
  });
});
