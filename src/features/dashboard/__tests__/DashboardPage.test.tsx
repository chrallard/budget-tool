import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../DashboardPage";
import { getCurrentMonth } from "../dashboardCalculations";
import type { DashboardDataSource } from "../dashboardDataSource";
import { formatMonthLabel } from "../format";
import type { DashboardData } from "../types";

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function createStubDataSource(getDashboardData: (month: string) => Promise<DashboardData>): DashboardDataSource {
  return { getDashboardData };
}

function getCategoryCard(category: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: category });
  return heading.closest("article") as HTMLElement;
}

describe("DashboardPage", () => {
  it("defaults to current month", async () => {
    const expectedMonth = getCurrentMonth();

    const dataSource = createStubDataSource(async (month) => ({
      month,
      expenseCategories: ["Food"],
      budgetTargets: [{ category: "Food", monthlyTarget: 200 }],
      expenses: [{ date: "05-01-2026", category: "Food", amount: 100 }],
      income: [{ date: "05-01-2026", category: "Salary", amount: 2000 }],
    }));

    render(<DashboardPage dataSource={dataSource} />);
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: formatMonthLabel(expectedMonth),
      }),
    ).toBeInTheDocument();
  });

  it("renders one card per backend expense category", async () => {
    const dataSource = createStubDataSource(async () => ({
      month: "2026-05",
      expenseCategories: ["Food", "Rent", "Gas"],
      budgetTargets: [],
      expenses: [
        { date: "05-01-2026", category: "Food", amount: 100 },
        { date: "05-01-2026", category: "Other", amount: 999 },
      ],
      income: [],
    }));

    render(<DashboardPage dataSource={dataSource} />);

    expect(await screen.findByRole("heading", { name: "Food" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rent" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gas" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Other" })).not.toBeInTheDocument();
  });

  it("updates calculations when month selection changes", async () => {
    const getDashboardData = vi.fn(async () => ({
      month: "2026-05",
      expenseCategories: ["Food"],
      budgetTargets: [{ category: "Food", monthlyTarget: 500 }],
      expenses: [
        { date: "05-01-2026", category: "Food", amount: 300 },
        { date: "04-01-2026", category: "Food", amount: 100 },
      ],
      income: [],
    }));
    const dataSource = createStubDataSource(getDashboardData);
    const user = userEvent.setup();

    render(<DashboardPage dataSource={dataSource} />);

    const mayCard = await screen.findByRole("heading", { name: "Food" });
    expect(within(mayCard.closest("article") as HTMLElement).getByText("$300.00")).toBeInTheDocument();

    const select = screen.getByLabelText("Month");
    await user.selectOptions(select, "2026-04");

    expect(getDashboardData).toHaveBeenCalledWith("2026-04");

    const aprilCard = getCategoryCard("Food");
    expect(within(aprilCard).getByText("$100.00")).toBeInTheDocument();
  });

  it("shows over-budget state and no-budget-target state", async () => {
    const dataSource = createStubDataSource(async () => ({
      month: "2026-05",
      expenseCategories: ["Rent", "Pets"],
      budgetTargets: [{ category: "Rent", monthlyTarget: 1200 }],
      expenses: [
        { date: "05-01-2026", category: "Rent", amount: 1400 },
        { date: "05-01-2026", category: "Pets", amount: 50 },
      ],
      income: [],
    }));

    render(<DashboardPage dataSource={dataSource} />);

    expect(await screen.findByText("Over budget")).toBeInTheDocument();
    expect(screen.getByText("No budget target set for this category.")).toBeInTheDocument();
  });

  it("applies mobile-safe overflow protection", async () => {
    const dataSource = createStubDataSource(async () => ({
      month: "2026-05",
      expenseCategories: ["Food"],
      budgetTargets: [{ category: "Food", monthlyTarget: 200 }],
      expenses: [{ date: "05-01-2026", category: "Food", amount: 100 }],
      income: [],
    }));

    render(<DashboardPage dataSource={dataSource} />);
    await screen.findByRole("heading", { name: "Food" });

    const page = document.querySelector("main");
    expect(page).not.toBeNull();
    expect(page?.getAttribute("style")).toContain("overflow-x: hidden");
  });
});
