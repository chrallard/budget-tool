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

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sheetDate(month: string, day = "01"): string {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}-${day}-${year}`;
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
    const currentMonth = getCurrentMonth();
    const previousMonth = shiftMonth(currentMonth, -1);
    const getDashboardData = vi.fn(async () => ({
      month: currentMonth,
      availableMonths: [currentMonth, previousMonth],
      expenseCategories: ["Food"],
      budgetTargets: [{ category: "Food", monthlyTarget: 500 }],
      expenses: [
        { date: sheetDate(currentMonth), category: "Food", amount: 300 },
        { date: sheetDate(previousMonth), category: "Food", amount: 100 },
      ],
      income: [],
    }));
    const dataSource = createStubDataSource(getDashboardData);
    const user = userEvent.setup();

    render(<DashboardPage dataSource={dataSource} />);

    const currentCard = await screen.findByRole("heading", { name: "Food" });
    expect(within(currentCard.closest("article") as HTMLElement).getByText("$300.00")).toBeInTheDocument();

    const select = screen.getByLabelText("Month");
    await user.selectOptions(select, previousMonth);

    expect(getDashboardData).toHaveBeenCalledWith(previousMonth);

    const previousCard = getCategoryCard("Food");
    expect(await within(previousCard).findByText("$100.00")).toBeInTheDocument();
  });

  it("keeps the loaded month visible while the next month loads", async () => {
    const initialMonth = getCurrentMonth();
    const otherMonth = initialMonth === "2026-04" ? "2026-05" : "2026-04";
    const [year, monthNumber] = initialMonth.split("-");
    let resolveOther: (data: DashboardData) => void = () => {};
    const getDashboardData = vi.fn((month: string) => {
      if (month === otherMonth) {
        return new Promise<DashboardData>((resolve) => {
          resolveOther = resolve;
        });
      }

      return Promise.resolve({
        month,
        availableMonths: [initialMonth, otherMonth].sort((left, right) => right.localeCompare(left)),
        expenseCategories: ["Food"],
        budgetTargets: [{ category: "Food", monthlyTarget: 500 }],
        expenses: [{ date: `${monthNumber}-01-${year}`, category: "Food", amount: 300 }],
        income: [],
      });
    });
    const user = userEvent.setup();

    render(<DashboardPage dataSource={createStubDataSource(getDashboardData)} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: formatMonthLabel(initialMonth) }),
    ).toBeInTheDocument();
    expect(within(getCategoryCard("Food")).getByText("$300.00")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Month"), otherMonth);

    expect(screen.getByRole("heading", { level: 1, name: formatMonthLabel(initialMonth) })).toBeInTheDocument();
    expect(within(getCategoryCard("Food")).getByText("$300.00")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: `Loading ${formatMonthLabel(otherMonth)}` })).toBeInTheDocument();
    expect(screen.getByLabelText("Month")).toHaveValue(otherMonth);

    const [otherYear, otherMonthNumber] = otherMonth.split("-");
    resolveOther({
      month: otherMonth,
      availableMonths: [initialMonth, otherMonth],
      expenseCategories: ["Food"],
      budgetTargets: [{ category: "Food", monthlyTarget: 500 }],
      expenses: [{ date: `${otherMonthNumber}-02-${otherYear}`, category: "Food", amount: 100 }],
      income: [],
    });

    expect(
      await screen.findByRole("heading", { level: 1, name: formatMonthLabel(otherMonth) }),
    ).toBeInTheDocument();
    expect(within(getCategoryCard("Food")).getByText("$100.00")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps the loaded month visible when the next month fails, then retries", async () => {
    const initialMonth = getCurrentMonth();
    const otherMonth = initialMonth === "2026-04" ? "2026-05" : "2026-04";
    const [year, monthNumber] = initialMonth.split("-");
    const [otherYear, otherMonthNumber] = otherMonth.split("-");
    const availableMonths = [initialMonth, otherMonth].sort((left, right) => right.localeCompare(left));
    const getDashboardData = vi.fn(async (month: string) => {
      if (month === otherMonth) {
        const attempts = getDashboardData.mock.calls.filter((call) => call[0] === otherMonth).length;
        if (attempts === 1) {
          throw new Error("Sheet read failed");
        }

        return {
          month,
          availableMonths,
          expenseCategories: ["Food"],
          budgetTargets: [{ category: "Food", monthlyTarget: 500 }],
          expenses: [{ date: `${otherMonthNumber}-02-${otherYear}`, category: "Food", amount: 80 }],
          income: [],
        };
      }

      return {
        month,
        availableMonths,
        expenseCategories: ["Food"],
        budgetTargets: [{ category: "Food", monthlyTarget: 500 }],
        expenses: [{ date: `${monthNumber}-01-${year}`, category: "Food", amount: 300 }],
        income: [],
      };
    });
    const user = userEvent.setup();

    render(<DashboardPage dataSource={createStubDataSource(getDashboardData)} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: formatMonthLabel(initialMonth) }),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Month"), otherMonth);

    expect(await screen.findByRole("alert")).toHaveTextContent("Sheet read failed");
    expect(screen.getByRole("heading", { level: 1, name: formatMonthLabel(initialMonth) })).toBeInTheDocument();
    expect(within(getCategoryCard("Food")).getByText("$300.00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: formatMonthLabel(otherMonth) }),
    ).toBeInTheDocument();
    expect(within(getCategoryCard("Food")).getByText("$80.00")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retries a failed initial dashboard load", async () => {
    const month = getCurrentMonth();
    const [year, monthNumber] = month.split("-");
    const getDashboardData = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network down"))
      .mockResolvedValueOnce({
        month,
        expenseCategories: ["Food"],
        budgetTargets: [],
        expenses: [{ date: `${monthNumber}-01-${year}`, category: "Food", amount: 40 }],
        income: [],
      });
    const user = userEvent.setup();

    render(<DashboardPage dataSource={createStubDataSource(getDashboardData)} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "Food" })).toBeInTheDocument();
    expect(getDashboardData).toHaveBeenCalledTimes(2);
    expect(getDashboardData).toHaveBeenNthCalledWith(1, month);
    expect(getDashboardData).toHaveBeenNthCalledWith(2, month);
  });

  it("shows over-budget state and no-budget-target state", async () => {
    const month = getCurrentMonth();
    const dataSource = createStubDataSource(async () => ({
      month,
      expenseCategories: ["Rent", "Pets"],
      budgetTargets: [{ category: "Rent", monthlyTarget: 1200 }],
      expenses: [
        { date: sheetDate(month), category: "Rent", amount: 1400 },
        { date: sheetDate(month), category: "Pets", amount: 50 },
      ],
      income: [],
    }));

    render(<DashboardPage dataSource={dataSource} />);

    expect(await screen.findByText("Over budget")).toBeInTheDocument();
    expect(screen.getByText("No budget target set for this category.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Expected Spending" }).closest("article")).toHaveTextContent(
      "$1,200.00",
    );
    expect(screen.getByRole("heading", { name: "Left in Plan" }).closest("article")).toHaveTextContent("-$250.00");
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
