import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryTransactionsPage } from "../CategoryTransactionsPage";
import type { DashboardDataSource } from "../dashboardDataSource";
import type { DashboardData } from "../types";

afterEach(() => {
  cleanup();
});

function createStubDataSource(getDashboardData: (month: string) => Promise<DashboardData>): DashboardDataSource {
  return { getDashboardData };
}

describe("CategoryTransactionsPage", () => {
  it("reuses provided dashboard data without loading again", async () => {
    const getDashboardData = vi.fn(async (month: string) => ({
      month,
      expenseCategories: ["Food"],
      budgetTargets: [{ category: "Food", monthlyTarget: 500 }],
      expenses: [],
      income: [],
    }));

    const initialDashboardData: DashboardData = {
      month: "2026-05",
      expenseCategories: ["Food"],
      budgetTargets: [{ category: "Food", monthlyTarget: 500 }],
      expenses: [{ date: "05-12-2026", category: "Food", amount: 32.45, vendor: "LOBLAWS" }],
      income: [],
    };

    render(
      <CategoryTransactionsPage
        category="Food"
        month="2026-05"
        onBack={() => { }}
        dataSource={createStubDataSource(getDashboardData)}
        initialDashboardData={initialDashboardData}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Food" })).toBeInTheDocument();
    expect(screen.getAllByText("LOBLAWS").length).toBeGreaterThan(0);
    expect(getDashboardData).not.toHaveBeenCalled();
  });
});
