import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NormalizedTransaction } from "../../../shared/types/transactions";
import { TransactionReviewCard } from "../TransactionReviewCard";

const longDescription =
  "VISA DEBIT RETAIL PURCHASE STARBUCKS COFFEE 1234 VERY LONG MERCHANT MEMO THAT WRAPS THE REVIEW HEADER";

function transaction(overrides: Partial<NormalizedTransaction> = {}): NormalizedTransaction {
  return {
    id: "tx-1",
    sourceAccount: "chequing",
    originalDate: "2026-05-24",
    displayDate: "05-24-2026",
    originalDescription: longDescription,
    normalizedDescription: longDescription,
    originalAmount: -12.34,
    editableAmount: 12.34,
    direction: "expense",
    status: "pending",
    duplicateStatus: "not_duplicate",
    importFingerprint: "fp-1",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("TransactionReviewCard title", () => {
  it("keeps a long expense title in a clamped heading", () => {
    render(
      <TransactionReviewCard
        transaction={transaction()}
        config={{ expenseCategories: ["Food"], incomeCategories: ["Salary"] }}
        onCategoryChange={() => {}}
        onAmountChange={() => {}}
        onDisplayNameOverrideChange={() => {}}
        onNotesChange={() => {}}
        onStartSplit={() => {}}
        onAddSplit={() => {}}
        onRemoveSplit={() => {}}
        onClearSplit={() => {}}
        onSplitAmountChange={() => {}}
        onSplitCategoryChange={() => {}}
        onApprove={() => {}}
        onSkip={() => {}}
        onIgnore={() => {}}
      />,
    );

    const heading = screen.getByRole("heading", { name: longDescription });
    expect(heading).toHaveClass("transaction-card__title");
    expect(heading).toHaveAttribute("title", longDescription);
  });

  it("offers allotments that fund the selected category in the expense month", async () => {
    const user = userEvent.setup();
    const onAllotmentChange = vi.fn();

    render(
      <TransactionReviewCard
        transaction={transaction({ selectedCategory: "Food" })}
        config={{ expenseCategories: ["Food", "Home"], incomeCategories: ["Salary"] }}
        allotments={[
          {
            id: "allotment-food",
            profitMonth: "2026-04",
            name: "Groceries",
            amount: 200,
            category: "Food",
            expenseIds: [],
          },
          {
            id: "allotment-home",
            profitMonth: "2026-04",
            name: "Lamp",
            amount: 80,
            category: "Home",
            expenseIds: [],
          },
          {
            id: "allotment-later",
            profitMonth: "2026-05",
            name: "June groceries",
            amount: 50,
            category: "Food",
            expenseIds: [],
          },
        ]}
        onCategoryChange={() => {}}
        onAllotmentChange={onAllotmentChange}
        onAmountChange={() => {}}
        onDisplayNameOverrideChange={() => {}}
        onNotesChange={() => {}}
        onStartSplit={() => {}}
        onAddSplit={() => {}}
        onRemoveSplit={() => {}}
        onClearSplit={() => {}}
        onSplitAmountChange={() => {}}
        onSplitCategoryChange={() => {}}
        onApprove={() => {}}
        onSkip={() => {}}
        onIgnore={() => {}}
      />,
    );

    const allotment = screen.getByRole("combobox", { name: "Allotment" });
    expect(screen.getByRole("option", { name: /Groceries/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Lamp/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /June groceries/ })).not.toBeInTheDocument();
    await user.selectOptions(allotment, "allotment-food");
    expect(onAllotmentChange).toHaveBeenCalledWith("allotment-food");
  });

  it("does not offer an allotment for income", () => {
    render(
      <TransactionReviewCard
        transaction={transaction({ direction: "income", selectedCategory: "Salary" })}
        config={{ expenseCategories: ["Food"], incomeCategories: ["Salary"] }}
        allotments={[
          {
            id: "allotment-food",
            profitMonth: "2026-04",
            name: "Groceries",
            amount: 200,
            category: "Food",
            expenseIds: [],
          },
        ]}
        onCategoryChange={() => {}}
        onAmountChange={() => {}}
        onDisplayNameOverrideChange={() => {}}
        onNotesChange={() => {}}
        onStartSplit={() => {}}
        onAddSplit={() => {}}
        onRemoveSplit={() => {}}
        onClearSplit={() => {}}
        onSplitAmountChange={() => {}}
        onSplitCategoryChange={() => {}}
        onApprove={() => {}}
        onSkip={() => {}}
        onIgnore={() => {}}
      />,
    );

    expect(screen.queryByRole("combobox", { name: "Allotment" })).not.toBeInTheDocument();
  });
});
