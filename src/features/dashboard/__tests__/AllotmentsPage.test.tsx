import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AllotmentsPage } from "../AllotmentsPage";
import { getCurrentMonth } from "../dashboardCalculations";
import type { DashboardDataSource } from "../dashboardDataSource";
import { formatMonthLabel } from "../format";
import type { Allotment, AllotmentDraft, DashboardData } from "../types";

afterEach(() => {
  cleanup();
});

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sheetDate(month: string, day = "01"): string {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}-${day}-${year}`;
}

function createStubDataSource(
  getDashboardData: (month: string) => Promise<DashboardData>,
  allotments?: Partial<Pick<DashboardDataSource, "getAllotments" | "saveAllotment" | "deleteAllotment">>,
): DashboardDataSource {
  return {
    getDashboardData,
    getAllotments: allotments?.getAllotments ?? (async () => []),
    saveAllotment:
      allotments?.saveAllotment ??
      (async (draft: AllotmentDraft) => ({
        id: draft.id ?? "allotment-1",
        profitMonth: draft.profitMonth,
        name: draft.name,
        amount: draft.amount,
        category: draft.category,
        expenseIds: draft.expenseIds ?? [],
      })),
    deleteAllotment: allotments?.deleteAllotment ?? (async () => {}),
  };
}

function summaryArticle(name: string): HTMLElement {
  const heading = screen.getByRole("heading", { name });
  const article = heading.closest("article");
  if (!article) {
    throw new Error(`Missing summary article for ${name}`);
  }
  return article;
}

describe("AllotmentsPage", () => {
  it("shows meaningful profit and keeps an unlinked plan off the category total", async () => {
    const month = getCurrentMonth();
    const prior = shiftMonth(month, -1);
    const source = shiftMonth(month, -2);
    const stored: Allotment[] = [
      {
        id: "prior-bed",
        profitMonth: source,
        name: "Bed frame",
        amount: 800,
        category: "Home",
        expenseIds: ["prior-home"],
      },
      {
        id: "plan",
        profitMonth: prior,
        name: "Lamp",
        amount: 1000,
        category: "Home",
        expenseIds: ["bed"],
      },
    ];
    const dataSource = createStubDataSource(
      async (requestedMonth) => ({
        month: requestedMonth,
        expenseCategories: ["Home", "Food"],
        budgetTargets: [{ category: "Home", monthlyTarget: 200 }],
        expenses:
          requestedMonth === prior
            ? [{ id: "prior-home", date: sheetDate(prior), category: "Home", amount: 800, vendor: "Prior bed" }]
            : [
                { id: "bed", date: sheetDate(month), category: "Home", amount: 600, vendor: "Mattress" },
                { id: "snack", date: sheetDate(month), category: "Food", amount: 100, vendor: "Cafe" },
              ],
        income:
          requestedMonth === prior
            ? [{ date: sheetDate(prior), category: "Salary", amount: 5000 }]
            : [{ date: sheetDate(month), category: "Salary", amount: 1000 }],
      }),
      {
        getAllotments: async (profitMonth) => stored.filter((allotment) => allotment.profitMonth === profitMonth),
      },
    );

    render(<AllotmentsPage dataSource={dataSource} />);

    expect(await screen.findByRole("heading", { name: "Meaningful profit" })).toBeInTheDocument();
    expect(summaryArticle("Total Income")).toHaveTextContent("$1,000.00");
    expect(summaryArticle("Total Spending")).toHaveTextContent("$100.00");
    expect(summaryArticle("Meaningful profit")).toHaveTextContent("$900.00");

    const workingCapital = screen.getByRole("region", { name: "To work with" });
    expect(workingCapital).toHaveTextContent("$5,000.00");
    expect(workingCapital).toHaveTextContent("Allotted");
    expect(workingCapital).toHaveTextContent("$1,000.00");
    expect(workingCapital).toHaveTextContent("Fulfilled");
    expect(workingCapital).toHaveTextContent("$600.00");
    expect(workingCapital).toHaveTextContent("Still free");
    expect(workingCapital).toHaveTextContent("$4,000.00");
    expect(workingCapital).toHaveTextContent(formatMonthLabel(prior));

    const home = screen.getByRole("heading", { name: "Home" }).closest("article");
    expect(home).not.toBeNull();
    expect(within(home as HTMLElement).getByText("$0.00")).toBeInTheDocument();
    expect(within(home as HTMLElement).getByRole("heading", { name: "Lamp" })).toBeInTheDocument();
    expect(within(home as HTMLElement).getByText("$1,000.00")).toBeInTheDocument();
    expect(within(home as HTMLElement).getAllByText("$600.00").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Home" })).not.toBeInTheDocument();

    const food = screen.getByRole("heading", { name: "Food" }).closest("article");
    expect(within(food as HTMLElement).getByText("$100.00")).toBeInTheDocument();
  });

  it("links a whole expense and adds that amount back past the plan", async () => {
    const month = getCurrentMonth();
    const prior = shiftMonth(month, -1);
    const stored: Allotment[] = [];
    const user = userEvent.setup();
    const dataSource = createStubDataSource(
      async (requestedMonth) => ({
        month: requestedMonth,
        expenseCategories: ["Home"],
        budgetTargets: [{ category: "Home", monthlyTarget: 200 }],
        expenses:
          requestedMonth === month
            ? [{ id: "lamp-tx", date: sheetDate(month), category: "Home", amount: 250, vendor: "Lamp shop" }]
            : [],
        income: [{ date: sheetDate(requestedMonth), category: "Salary", amount: 1000 }],
      }),
      {
        getAllotments: async (profitMonth) => stored.filter((allotment) => allotment.profitMonth === profitMonth),
        saveAllotment: async (draft) => {
          const saved: Allotment = {
            id: draft.id ?? "lamp",
            profitMonth: draft.profitMonth,
            name: draft.name,
            amount: draft.amount,
            category: draft.category,
            expenseIds: draft.expenseIds ?? [],
          };
          const index = stored.findIndex((allotment) => allotment.id === saved.id);
          if (index >= 0) {
            stored[index] = saved;
          } else {
            stored.push(saved);
          }
          return saved;
        },
      },
    );

    render(<AllotmentsPage dataSource={dataSource} />);

    expect(await screen.findByRole("heading", { name: "Meaningful profit" })).toBeInTheDocument();
    expect(summaryArticle("Total Spending")).toHaveTextContent("$250.00");

    await user.click(screen.getByRole("button", { name: "Add Home allotment" }));
    await user.type(screen.getByRole("textbox", { name: "Home allotment name" }), "Lamp");
    await user.type(screen.getByRole("textbox", { name: "Home allotment amount" }), "100");
    await user.click(screen.getByRole("button", { name: "Add Home allotment" }));

    expect(await screen.findByText("Lamp")).toBeInTheDocument();
    const workingCapital = screen.getByRole("region", { name: "To work with" });
    expect(workingCapital).toHaveTextContent("Allotted");
    expect(workingCapital).toHaveTextContent("$100.00");
    expect(workingCapital).toHaveTextContent("Fulfilled");
    expect(workingCapital).toHaveTextContent("$0.00");
    expect(workingCapital).toHaveTextContent("Still free");
    expect(workingCapital).toHaveTextContent("$900.00");
    expect(summaryArticle("Total Spending")).toHaveTextContent("$250.00");

    await user.selectOptions(screen.getByRole("combobox", { name: "Link expense to Lamp" }), "lamp-tx");

    expect(await screen.findByRole("heading", { name: "Lamp" })).toBeInTheDocument();
    const lamp = screen.getByRole("heading", { name: "Lamp" }).closest("li");
    expect(lamp).not.toBeNull();
    expect(within(lamp as HTMLElement).getAllByText("$250.00").length).toBeGreaterThan(0);
    expect(summaryArticle("Total Spending")).toHaveTextContent("$0.00");
    expect(summaryArticle("Meaningful profit")).toHaveTextContent("$1,000.00");
    expect(workingCapital).toHaveTextContent("Fulfilled");
    expect(workingCapital).toHaveTextContent("$250.00");
    expect(workingCapital).toHaveTextContent("Over the plans by");
    expect(workingCapital).toHaveTextContent("$150.00");
    expect(workingCapital).toHaveTextContent("$900.00");
  });
});
