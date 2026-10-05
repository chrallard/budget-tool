import type { DashboardData } from "./types";

export const mockDashboardData: DashboardData = {
  month: "2026-05",
  expenseCategories: ["Food", "Rent", "Gas", "Entertainment", "Pets"],
  budgetTargets: [
    { category: "Food", monthlyTarget: 600 },
    { category: "Rent", monthlyTarget: 1800 },
    { category: "Gas", monthlyTarget: 250 },
    { category: "Entertainment", monthlyTarget: 180 },
  ],
  expenses: [
    { id: "food-loblaws", date: "05-01-2026", category: "Food", amount: 140, vendor: "Loblaws" },
    { id: "food-refund", date: "05-06-2026", category: "Food", amount: -20, vendor: "Refund" },
    { id: "rent-landlord", date: "05-03-2026", category: "Rent", amount: 1800, vendor: "Landlord" },
    { id: "gas-shell", date: "05-04-2026", category: "Gas", amount: 120, vendor: "Shell" },
    { id: "entertainment-movies", date: "05-10-2026", category: "Entertainment", amount: 95, vendor: "Movies" },
    { id: "food-prior", date: "04-28-2026", category: "Food", amount: 80, vendor: "Prior month" }
  ],
  income: [
    { date: "05-01-2026", category: "Salary", amount: 3600, source: "Employer" },
    { date: "05-15-2026", category: "Salary", amount: 1200, source: "Contract" },
    { date: "04-15-2026", category: "Salary", amount: 1200, source: "Older" }
  ]
};
