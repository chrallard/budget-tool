import { describe, expect, it } from "vitest";
import { allotmentsForExpense, previousMonth, profitMonthsForExpenses } from "../matchingAllotments";

describe("matchingAllotments", () => {
  it("uses the month before the expense as the profit month", () => {
    expect(previousMonth("2026-05")).toBe("2026-04");
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(profitMonthsForExpenses(["05-01-2026", "01-15-2026", "05-20-2026"])).toEqual(["2026-04", "2025-12"]);
  });

  it("keeps plans whose spending month and category match the expense", () => {
    const allotments = [
      {
        id: "food",
        profitMonth: "2026-04",
        name: "Groceries",
        amount: 200,
        category: "Food",
        expenseIds: [],
      },
      {
        id: "january",
        profitMonth: "2025-12",
        name: "Winter food",
        amount: 40,
        category: "Food",
        expenseIds: [],
      },
    ];

    expect(allotmentsForExpense(allotments, "Food", "05-01-2026").map((allotment) => allotment.id)).toEqual(["food"]);
    expect(allotmentsForExpense(allotments, "Food", "01-02-2026").map((allotment) => allotment.id)).toEqual(["january"]);
    expect(allotmentsForExpense(allotments, "Home", "05-01-2026")).toEqual([]);
  });
});