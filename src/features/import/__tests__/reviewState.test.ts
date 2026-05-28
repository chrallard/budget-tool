import { describe, expect, it } from "vitest";
import type { NormalizedTransaction } from "../../../shared/types/transactions";
import {
  approveTransaction,
  buildApprovedImportBatch,
  createImportReviewState,
  failSubmission,
  finishSubmission,
  getCurrentTransaction,
  getReviewCounts,
  ignoreTransaction,
  reopenTransaction,
  setTransactionAmount,
  setTransactionCategory,
  setTransactionNotes,
  skipTransaction,
  startSubmission,
} from "../reviewState";

function createTransaction(overrides: Partial<NormalizedTransaction> = {}): NormalizedTransaction {
  return {
    id: overrides.id ?? "tx-1",
    sourceAccount: overrides.sourceAccount ?? "chequing",
    originalDate: overrides.originalDate ?? "2026-05-01",
    displayDate: overrides.displayDate ?? "05-01-2026",
    originalDescription: overrides.originalDescription ?? "Coffee Shop",
    normalizedDescription: overrides.normalizedDescription ?? "COFFEE SHOP",
    originalAmount: overrides.originalAmount ?? -14.25,
    editableAmount: overrides.editableAmount ?? 14.25,
    direction: overrides.direction ?? "expense",
    suggestedCategory: overrides.suggestedCategory,
    selectedCategory: overrides.selectedCategory,
    notes: overrides.notes,
    status: overrides.status ?? "pending",
    ignoreReason: overrides.ignoreReason,
    duplicateStatus: overrides.duplicateStatus ?? "not_duplicate",
    duplicateMatches: overrides.duplicateMatches,
    importFingerprint: overrides.importFingerprint ?? "chequing|2026-05-01|-14.25|COFFEE SHOP",
  };
}

describe("reviewState", () => {
  it("preselects only valid suggested categories", () => {
    const state = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      transactions: [
        createTransaction({ suggestedCategory: "Dining", selectedCategory: "Dining" }),
        createTransaction({
          id: "tx-2",
          suggestedCategory: "Invalid",
          selectedCategory: "Invalid",
        }),
      ],
    });

    expect(state.transactions[0]?.selectedCategory).toBe("Dining");
    expect(state.transactions[1]?.selectedCategory).toBeUndefined();
    expect(state.transactions[1]?.suggestedCategory).toBeUndefined();
  });

  it("blocks approval until a valid category is selected", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      transactions: [createTransaction()],
    });

    const attempted = approveTransaction(initial, "tx-1");
    expect(attempted.transactions[0]?.status).toBe("pending");

    const withCategory = setTransactionCategory(initial, "tx-1", "Dining");
    const approved = approveTransaction(withCategory, "tx-1");
    expect(approved.transactions[0]?.status).toBe("approved");
  });

  it("keeps original amount unchanged when editable amount is updated", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      transactions: [createTransaction({ selectedCategory: "Dining" })],
    });

    const updated = setTransactionAmount(initial, "tx-1", 18.5);
    expect(updated.transactions[0]?.editableAmount).toBe(18.5);
    expect(updated.transactions[0]?.originalAmount).toBe(-14.25);
  });

  it("tracks notes, skipped, and ignored transitions in queue order", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      transactions: [
        createTransaction({ id: "tx-1" }),
        createTransaction({ id: "tx-2", originalDescription: "Transfer", suggestedCategory: "Dining" }),
      ],
    });

    const withNotes = setTransactionNotes(initial, "tx-1", "team lunch");
    expect(withNotes.transactions[0]?.notes).toBe("team lunch");

    const skipped = skipTransaction(withNotes, "tx-1");
    expect(skipped.transactions[0]?.status).toBe("skipped");
    expect(getCurrentTransaction(skipped)?.id).toBe("tx-2");

    const ignored = ignoreTransaction(skipped, "tx-2", "internal_transfer");
    expect(ignored.transactions[1]?.status).toBe("ignored");
    expect(ignored.transactions[1]?.ignoreReason).toBe("internal_transfer");
    expect(getCurrentTransaction(ignored)).toBeNull();
  });

  it("can reopen an approved transaction back to pending", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      transactions: [createTransaction({ selectedCategory: "Dining", status: "approved" })],
    });

    const reopened = reopenTransaction(initial, "tx-1");
    expect(reopened.transactions[0]?.status).toBe("pending");
  });

  it("builds import payloads from approved rows only", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      transactions: [
        createTransaction({ id: "approved", selectedCategory: "Dining", status: "approved", notes: " keep me " }),
        createTransaction({ id: "skipped", selectedCategory: "Dining", status: "skipped" }),
        createTransaction({ id: "ignored", selectedCategory: "Dining", status: "ignored" }),
      ],
    });

    const payload = buildApprovedImportBatch(initial, "2026-05");
    expect(payload.action).toBe("importBatch");
    expect(payload.month).toBe("2026-05");
    expect(payload.approvedTransactions).toHaveLength(1);
    expect(payload.approvedTransactions[0]).toMatchObject({
      id: "approved",
      selectedCategory: "Dining",
      notes: "keep me",
    });
  });

  it("preserves the review session on submission failure", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      transactions: [createTransaction({ selectedCategory: "Dining", status: "approved" })],
    });

    const submitting = startSubmission(initial);
    expect(submitting.submission.isSubmitting).toBe(true);

    const failed = failSubmission(submitting, "Backend submission failed.");
    expect(failed.submission.error).toBe("Backend submission failed.");
    expect(failed.transactions).toHaveLength(1);
    expect(failed.transactions[0]?.status).toBe("approved");
  });

  it("reports counts and success state after submission", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      transactions: [
        createTransaction({ id: "approved", selectedCategory: "Dining", status: "approved" }),
        createTransaction({ id: "pending" }),
        createTransaction({ id: "ignored", status: "ignored", selectedCategory: "Dining" }),
      ],
    });

    expect(getReviewCounts(initial)).toEqual({
      pending: 1,
      approved: 1,
      skipped: 0,
      ignored: 1,
    });

    const finished = finishSubmission(initial, { expenses: 1, income: 0 });
    expect(finished.submission.successMessage).toContain("Imported 1 transactions successfully.");
  });
});