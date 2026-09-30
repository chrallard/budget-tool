import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
});
