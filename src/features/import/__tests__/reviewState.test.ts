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
  addTransactionSplit,
  clearTransactionSplit,
  removeTransactionSplit,
  setSplitAllotment,
  setSplitAmount,
  setSplitCategory,
  setTransactionAllotment,
  setTransactionAmount,
  setTransactionCategory,
  setTransactionDisplayNameOverride,
  setTransactionNotes,
  skipTransaction,
  startTransactionSplit,
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
    displayNameOverride: overrides.displayNameOverride,
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
    allotmentId: overrides.allotmentId,
    splits: overrides.splits,
  };
}

const groceries = {
  id: "allotment-food",
  profitMonth: "2026-04",
  name: "Groceries",
  amount: 200,
  category: "Food",
  expenseIds: [],
};

const lamp = {
  id: "allotment-home",
  profitMonth: "2026-04",
  name: "Lamp",
  amount: 80,
  category: "Home",
  expenseIds: [],
};

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

  it("tracks display name override and reopens approved transaction", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      transactions: [createTransaction({ selectedCategory: "Dining", status: "approved" })],
    });

    const withOverride = setTransactionDisplayNameOverride(initial, "tx-1", "Cafe Example");
    expect(withOverride.transactions[0]?.displayNameOverride).toBe("Cafe Example");
    expect(withOverride.transactions[0]?.status).toBe("pending");
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
        createTransaction({
          id: "approved",
          selectedCategory: "Dining",
          status: "approved",
          displayNameOverride: " Coffee Bar ",
          notes: " keep me ",
        }),
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
      displayNameOverride: "Coffee Bar",
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

  it("writes one import row per category when a transaction is split", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Food", "Home"],
        incomeCategories: ["Salary"],
      },
      transactions: [createTransaction({ selectedCategory: "Food", editableAmount: 40, originalAmount: -40 })],
    });

    const started = startTransactionSplit(initial, "tx-1");
    expect(approveTransaction(started, "tx-1").transactions[0]?.status).toBe("pending");

    const withAmounts = setSplitAmount(
      setSplitAmount(started, "tx-1", "split-1", 25),
      "tx-1",
      "split-2",
      15,
    );
    const withCategories = setSplitCategory(withAmounts, "tx-1", "split-2", "Home");
    const approved = approveTransaction(withCategories, "tx-1");
    expect(approved.transactions[0]?.status).toBe("approved");

    const payload = buildApprovedImportBatch(approved);
    expect(payload.approvedTransactions).toEqual([
      expect.objectContaining({
        id: "tx-1:split-1",
        selectedCategory: "Food",
        editableAmount: 25,
        originalAmount: -40,
        importFingerprint: "chequing|2026-05-01|-14.25|COFFEE SHOP",
      }),
      expect.objectContaining({
        id: "tx-1:split-2",
        selectedCategory: "Home",
        editableAmount: 15,
        importFingerprint: "chequing|2026-05-01|-14.25|COFFEE SHOP",
      }),
    ]);
  });

  it("returns to a single category when the extra parts are removed", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Food", "Home"],
        incomeCategories: ["Salary"],
      },
      transactions: [createTransaction({ selectedCategory: "Food" })],
    });

    const split = addTransactionSplit(startTransactionSplit(initial, "tx-1"), "tx-1");
    expect(split.transactions[0]?.splits).toHaveLength(3);

    const cleared = clearTransactionSplit(removeTransactionSplit(split, "tx-1", "split-3"), "tx-1");
    expect(cleared.transactions[0]?.splits).toBeUndefined();
    expect(cleared.transactions[0]?.selectedCategory).toBe("Food");
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

  it("leaves remembered fingerprints out of the pending queue and sends them on submit", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      rememberedFingerprints: ["chequing|2026-05-01|-14.25|COFFEE SHOP"],
      transactions: [
        createTransaction({ id: "remembered" }),
        createTransaction({
          id: "fresh",
          importFingerprint: "chequing|2026-05-02|-8.00|GROCERY",
          originalDescription: "Grocery",
        }),
      ],
    });

    expect(getCurrentTransaction(initial)?.id).toBe("fresh");
    expect(initial.transactions[0]?.status).toBe("skipped");

    const skipped = skipTransaction(initial, "fresh");
    const payload = buildApprovedImportBatch(skipped);

    expect(payload.approvedTransactions).toEqual([]);
    expect(payload.skippedFingerprints).toEqual([
      "chequing|2026-05-01|-14.25|COFFEE SHOP",
      "chequing|2026-05-02|-8.00|GROCERY",
    ]);
  });

  it("drops a remembered fingerprint once that transaction is approved", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      rememberedFingerprints: ["chequing|2026-05-01|-14.25|COFFEE SHOP"],
      transactions: [createTransaction({ id: "remembered", selectedCategory: "Dining" })],
    });

    const reopened = reopenTransaction(initial, "remembered");
    const approved = approveTransaction(reopened, "remembered");
    const payload = buildApprovedImportBatch(approved);

    expect(payload.approvedTransactions).toHaveLength(1);
    expect(payload.skippedFingerprints).toEqual([]);
  });

  it("skips detected duplicates before review starts", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Dining"],
        incomeCategories: ["Salary"],
      },
      transactions: [
        createTransaction({ id: "confirmed", duplicateStatus: "confirmed_duplicate" }),
        createTransaction({
          id: "possible",
          duplicateStatus: "possible_duplicate",
          importFingerprint: "chequing|2026-05-02|-8.00|GROCERY",
        }),
        createTransaction({
          id: "fresh",
          importFingerprint: "chequing|2026-05-03|-4.00|CAFE",
        }),
      ],
    });

    expect(initial.transactions[0]?.status).toBe("skipped");
    expect(initial.transactions[1]?.status).toBe("skipped");
    expect(getCurrentTransaction(initial)?.id).toBe("fresh");
    expect(getReviewCounts(initial).skipped).toBe(2);
  });

  it("includes an allotment id when the expense matches that plan", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Food", "Home"],
        incomeCategories: ["Salary"],
      },
      allotments: [groceries, lamp],
      transactions: [createTransaction({ selectedCategory: "Food" })],
    });

    const linked = setTransactionAllotment(initial, "tx-1", "allotment-food");
    const payload = buildApprovedImportBatch(approveTransaction(linked, "tx-1"));
    expect(payload.approvedTransactions[0]?.allotmentId).toBe("allotment-food");

    const changed = setTransactionCategory(linked, "tx-1", "Home");
    expect(changed.transactions[0]?.allotmentId).toBeUndefined();
    const dropped = buildApprovedImportBatch(approveTransaction(changed, "tx-1"));
    expect(dropped.approvedTransactions[0]?.allotmentId).toBeUndefined();
  });

  it("omits an allotment that does not fund that category and month", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Food"],
        incomeCategories: ["Salary"],
      },
      allotments: [lamp],
      transactions: [createTransaction({ selectedCategory: "Food", allotmentId: "allotment-home", status: "approved" })],
    });

    expect(buildApprovedImportBatch(initial).approvedTransactions[0]?.allotmentId).toBeUndefined();
  });

  it("links each split to its own allotment", () => {
    const initial = createImportReviewState({
      sourceAccount: "chequing",
      fileName: "rbc.csv",
      config: {
        expenseCategories: ["Food", "Home"],
        incomeCategories: ["Salary"],
      },
      allotments: [groceries, lamp],
      transactions: [createTransaction({ selectedCategory: "Food", editableAmount: 40, originalAmount: -40 })],
    });

    const started = startTransactionSplit(setTransactionAllotment(initial, "tx-1", "allotment-food"), "tx-1");
    const withAmounts = setSplitAmount(setSplitAmount(started, "tx-1", "split-1", 25), "tx-1", "split-2", 15);
    const withCategories = setSplitCategory(withAmounts, "tx-1", "split-2", "Home");
    const linked = setSplitAllotment(withCategories, "tx-1", "split-2", "allotment-home");
    const payload = buildApprovedImportBatch(approveTransaction(linked, "tx-1"));

    expect(payload.approvedTransactions[0]?.allotmentId).toBe("allotment-food");
    expect(payload.approvedTransactions[1]?.allotmentId).toBe("allotment-home");
    expect(setSplitCategory(linked, "tx-1", "split-1", "Home").transactions[0]?.splits?.[0]?.allotmentId).toBeUndefined();
  });
});