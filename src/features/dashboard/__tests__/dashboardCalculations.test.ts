import { describe, expect, it } from "vitest";
import {
  calculateAllotmentCategoryCards,
  calculateAllotmentSummary,
  calculateCategoryCards,
  calculateDashboardSummary,
  calculateMonthProfit,
  filterExpensesByMonth,
  fundedExpenseTotal,
  meaningfulProfit,
  previousMonth,
  stillFree,
} from "../dashboardCalculations";
import type { Allotment, BudgetTarget, ExpenseRow, IncomeRow } from "../types";

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
    const summary = calculateDashboardSummary("2026-05", expenses, income);

    expect(summary.totalSpending).toBe(1930);
    expect(summary.totalIncome).toBe(3200);
    expect(summary.profit).toBe(1270);
  });

  it("uses linked expenses, not the unlinked plan, for meaningful profit", () => {
    expect(previousMonth("2026-09")).toBe("2026-08");
    expect(previousMonth("2026-01")).toBe("2025-12");
    const monthExpenses: ExpenseRow[] = [
      { id: "bed-txn", date: "05-02-2026", category: "Rent", amount: 1000 },
      { id: "food-txn", date: "05-03-2026", category: "Food", amount: 80 },
      { id: "other-month", date: "04-02-2026", category: "Rent", amount: 500 },
    ];
    const allotments: Allotment[] = [
      {
        id: "bed",
        profitMonth: "2026-04",
        name: "Bed frame",
        amount: 400,
        category: "Rent",
        expenseIds: ["bed-txn", "missing", "other-month"],
      },
      {
        id: "lamp",
        profitMonth: "2026-04",
        name: "Lamp",
        amount: 200,
        category: "Food",
        expenseIds: [],
      },
    ];

    expect(fundedExpenseTotal(allotments, monthExpenses, "2026-05")).toBe(1000);
    expect(meaningfulProfit(1270, fundedExpenseTotal(allotments, monthExpenses, "2026-05"))).toBe(2270);
    expect(stillFree(1000, allotments)).toBe(400);

    const summary = calculateAllotmentSummary("2026-05", monthExpenses, income, allotments);
    expect(summary.totalIncome).toBe(3200);
    expect(summary.totalSpending).toBe(80);
    expect(summary.profit).toBe(3120);

    const cards = calculateAllotmentCategoryCards(expenseCategories, budgetTargets, monthExpenses, "2026-05", allotments);
    expect(cards.find((card) => card.category === "Rent")?.used).toBe(0);
    expect(cards.find((card) => card.category === "Food")?.used).toBe(80);
  });

  it("orders category cards by used spending in descending order", () => {
    const cards = calculateCategoryCards(
      ["Pets", "Entertainment", "Food", "Gas", "Other", "Savings", "Donations", "Coffee out"],
      budgetTargets,
      expenses,
      "2026-05",
    );

    expect(cards.map((card) => card.category)).toEqual([
      "Food",
      "Coffee out",
      "Donations",
      "Entertainment",
      "Gas",
      "Other",
      "Pets",
      "Savings",
    ]);
  });
});
