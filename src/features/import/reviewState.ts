import type {
  ImportBatchTransaction,
  PostImportBatchRequest,
} from "../../api/client";
import type {
  DuplicateStatus,
  IgnoreReason,
  NormalizedTransaction,
  TransactionDirection,
  TransactionSplit,
} from "../../shared/types/transactions";

export type ReviewConfig = {
  expenseCategories: string[];
  incomeCategories: string[];
};

export type ReviewSubmissionState = {
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
};

export type ImportReviewState = {
  sourceAccount: NormalizedTransaction["sourceAccount"];
  transactions: NormalizedTransaction[];
  config: ReviewConfig;
  fileName: string;
  submission: ReviewSubmissionState;
};

export function getAllowedCategories(
  direction: TransactionDirection,
  config: ReviewConfig,
): string[] {
  return direction === "expense" ? config.expenseCategories : config.incomeCategories;
}

export function isValidCategory(
  category: string | undefined,
  direction: TransactionDirection,
  config: ReviewConfig,
): boolean {
  if (!category) {
    return false;
  }

  return getAllowedCategories(direction, config).includes(category);
}

function sanitizeTransaction(
  transaction: NormalizedTransaction,
  config: ReviewConfig,
): NormalizedTransaction {
  const selectedCategory = isValidCategory(
    transaction.selectedCategory,
    transaction.direction,
    config,
  )
    ? transaction.selectedCategory
    : undefined;

  const suggestedCategory = isValidCategory(
    transaction.suggestedCategory,
    transaction.direction,
    config,
  )
    ? transaction.suggestedCategory
    : undefined;

  const splits = sanitizeSplits(transaction, config);

  return {
    ...transaction,
    selectedCategory: selectedCategory ?? suggestedCategory,
    suggestedCategory,
    splits,
  };
}

function sanitizeSplits(
  transaction: NormalizedTransaction,
  config: ReviewConfig,
): TransactionSplit[] | undefined {
  if (!transaction.splits || transaction.splits.length < 2) {
    return undefined;
  }

  return transaction.splits.map((split) => ({
    ...split,
    category: isValidCategory(split.category, transaction.direction, config)
      ? split.category
      : undefined,
  }));
}

function nextSplitId(splits: TransactionSplit[]): string {
  const max = splits.reduce((highest, split) => {
    const match = /^split-(\d+)$/.exec(split.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `split-${max + 1}`;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function hasSplitAmount(amount: number, total: number): boolean {
  if (!Number.isFinite(amount) || amount === 0) {
    return false;
  }

  if (total > 0) {
    return amount > 0;
  }

  return amount < 0;
}

export function getActiveSplits(transaction: NormalizedTransaction): TransactionSplit[] | null {
  if (!transaction.splits || transaction.splits.length < 2) {
    return null;
  }

  return transaction.splits;
}

export function getSplitRemaining(transaction: NormalizedTransaction): number {
  const allocatedCents = (transaction.splits ?? []).reduce((sum, split) => {
    if (!Number.isFinite(split.amount)) {
      return sum;
    }

    return sum + toCents(split.amount);
  }, 0);

  return (toCents(transaction.editableAmount) - allocatedCents) / 100;
}

export function createImportReviewState(params: {
  sourceAccount: NormalizedTransaction["sourceAccount"];
  transactions: NormalizedTransaction[];
  config: ReviewConfig;
  fileName: string;
}): ImportReviewState {
  return {
    sourceAccount: params.sourceAccount,
    transactions: params.transactions.map((transaction) =>
      sanitizeTransaction(transaction, params.config),
    ),
    config: params.config,
    fileName: params.fileName,
    submission: {
      isSubmitting: false,
      error: null,
      successMessage: null,
    },
  };
}

function updateTransaction(
  state: ImportReviewState,
  transactionId: string,
  updater: (transaction: NormalizedTransaction) => NormalizedTransaction,
): ImportReviewState {
  return {
    ...state,
    transactions: state.transactions.map((transaction) =>
      transaction.id === transactionId ? updater(transaction) : transaction,
    ),
    submission: {
      ...state.submission,
      error: null,
      successMessage: null,
    },
  };
}

export function getPendingTransactions(state: ImportReviewState): NormalizedTransaction[] {
  return state.transactions.filter((transaction) => transaction.status === "pending");
}

export function getCurrentTransaction(state: ImportReviewState): NormalizedTransaction | null {
  return getPendingTransactions(state)[0] ?? null;
}

export function getReviewCounts(state: ImportReviewState): {
  pending: number;
  approved: number;
  skipped: number;
  ignored: number;
} {
  return state.transactions.reduce(
    (counts, transaction) => {
      counts[transaction.status] += 1;
      return counts;
    },
    {
      pending: 0,
      approved: 0,
      skipped: 0,
      ignored: 0,
    },
  );
}

export function setTransactionCategory(
  state: ImportReviewState,
  transactionId: string,
  selectedCategory: string,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => ({
    ...transaction,
    selectedCategory,
    status: transaction.status === "approved" ? "pending" : transaction.status,
  }));
}

export function setTransactionNotes(
  state: ImportReviewState,
  transactionId: string,
  notes: string,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => ({
    ...transaction,
    notes,
    status: transaction.status === "approved" ? "pending" : transaction.status,
  }));
}

export function setTransactionAmount(
  state: ImportReviewState,
  transactionId: string,
  editableAmount: number,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => ({
    ...transaction,
    editableAmount,
    status: transaction.status === "approved" ? "pending" : transaction.status,
  }));
}

export function setTransactionDisplayNameOverride(
  state: ImportReviewState,
  transactionId: string,
  displayNameOverride: string,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => ({
    ...transaction,
    displayNameOverride,
    status: transaction.status === "approved" ? "pending" : transaction.status,
  }));
}

export function startTransactionSplit(
  state: ImportReviewState,
  transactionId: string,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => {
    if (getActiveSplits(transaction)) {
      return transaction;
    }

    return {
      ...transaction,
      status: transaction.status === "approved" ? "pending" : transaction.status,
      splits: [
        {
          id: "split-1",
          amount: transaction.editableAmount,
          category: transaction.selectedCategory,
        },
        {
          id: "split-2",
          amount: Number.NaN,
        },
      ],
    };
  });
}

export function addTransactionSplit(
  state: ImportReviewState,
  transactionId: string,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => {
    const splits = getActiveSplits(transaction);
    if (!splits) {
      return transaction;
    }

    return {
      ...transaction,
      status: transaction.status === "approved" ? "pending" : transaction.status,
      splits: [
        ...splits,
        {
          id: nextSplitId(splits),
          amount: Number.NaN,
        },
      ],
    };
  });
}

export function removeTransactionSplit(
  state: ImportReviewState,
  transactionId: string,
  splitId: string,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => {
    const splits = getActiveSplits(transaction);
    if (!splits) {
      return transaction;
    }

    const remaining = splits.filter((split) => split.id !== splitId);
    if (remaining.length >= 2) {
      return {
        ...transaction,
        status: transaction.status === "approved" ? "pending" : transaction.status,
        splits: remaining,
      };
    }

    return {
      ...transaction,
      status: transaction.status === "approved" ? "pending" : transaction.status,
      splits: undefined,
      selectedCategory: remaining[0]?.category ?? transaction.selectedCategory,
    };
  });
}

export function clearTransactionSplit(
  state: ImportReviewState,
  transactionId: string,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => ({
    ...transaction,
    status: transaction.status === "approved" ? "pending" : transaction.status,
    splits: undefined,
    selectedCategory: transaction.splits?.[0]?.category ?? transaction.selectedCategory,
  }));
}

export function setSplitAmount(
  state: ImportReviewState,
  transactionId: string,
  splitId: string,
  amount: number,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => {
    const splits = getActiveSplits(transaction);
    if (!splits) {
      return transaction;
    }

    return {
      ...transaction,
      status: transaction.status === "approved" ? "pending" : transaction.status,
      splits: splits.map((split) => (split.id === splitId ? { ...split, amount } : split)),
    };
  });
}

export function setSplitCategory(
  state: ImportReviewState,
  transactionId: string,
  splitId: string,
  category: string,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => {
    const splits = getActiveSplits(transaction);
    if (!splits) {
      return transaction;
    }

    return {
      ...transaction,
      status: transaction.status === "approved" ? "pending" : transaction.status,
      splits: splits.map((split) => (split.id === splitId ? { ...split, category } : split)),
    };
  });
}

export function reopenTransaction(
  state: ImportReviewState,
  transactionId: string,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => ({
    ...transaction,
    status: "pending",
    ignoreReason: undefined,
  }));
}

export function skipTransaction(
  state: ImportReviewState,
  transactionId: string,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => ({
    ...transaction,
    status: "skipped",
    ignoreReason: undefined,
  }));
}

export function ignoreTransaction(
  state: ImportReviewState,
  transactionId: string,
  ignoreReason: IgnoreReason,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => ({
    ...transaction,
    status: "ignored",
    ignoreReason,
  }));
}

export function getApprovalBlockReason(
  transaction: NormalizedTransaction,
  config: ReviewConfig,
): string | null {
  const hasBaseFields =
    transaction.displayDate.trim().length > 0 &&
    transaction.originalDescription.trim().length > 0 &&
    Number.isFinite(transaction.editableAmount) &&
    transaction.editableAmount !== 0;

  if (!hasBaseFields) {
    return "Select a valid category and keep a valid amount before approval.";
  }

  const splits = getActiveSplits(transaction);
  if (!splits) {
    return isValidCategory(transaction.selectedCategory, transaction.direction, config)
      ? null
      : "Select a valid category and keep a valid amount before approval.";
  }

  if (splits.some((split) => !isValidCategory(split.category, transaction.direction, config))) {
    return "Choose a category for each part.";
  }

  if (splits.some((split) => !hasSplitAmount(split.amount, transaction.editableAmount))) {
    return "Enter an amount for each part.";
  }

  const remaining = getSplitRemaining(transaction);
  if (remaining !== 0) {
    return `Parts must add up to the transaction amount. Remaining $${remaining.toFixed(2)}.`;
  }

  return null;
}

export function canApproveTransaction(
  transaction: NormalizedTransaction,
  config: ReviewConfig,
): boolean {
  return getApprovalBlockReason(transaction, config) === null;
}

export function approveTransaction(
  state: ImportReviewState,
  transactionId: string,
): ImportReviewState {
  return updateTransaction(state, transactionId, (transaction) => {
    if (!canApproveTransaction(transaction, state.config)) {
      return transaction;
    }

    return {
      ...transaction,
      status: "approved",
      ignoreReason: undefined,
    };
  });
}

export function hasOutstandingDuplicates(
  duplicateStatus: DuplicateStatus,
): boolean {
  return duplicateStatus === "possible_duplicate" || duplicateStatus === "confirmed_duplicate";
}

function toImportBatchTransaction(
  transaction: NormalizedTransaction,
  overrides?: {
    id: string;
    selectedCategory: string;
    editableAmount: number;
  },
): ImportBatchTransaction {
  return {
    id: overrides?.id ?? transaction.id,
    direction: transaction.direction,
    displayDate: transaction.displayDate,
    selectedCategory: overrides?.selectedCategory ?? transaction.selectedCategory ?? "",
    editableAmount: overrides?.editableAmount ?? transaction.editableAmount,
    displayNameOverride: transaction.displayNameOverride?.trim()
      ? transaction.displayNameOverride.trim()
      : undefined,
    notes: transaction.notes?.trim() ? transaction.notes.trim() : undefined,
    sourceAccount: transaction.sourceAccount,
    originalDate: transaction.originalDate,
    originalAmount: transaction.originalAmount,
    originalDescription: transaction.originalDescription,
    normalizedDescription: transaction.normalizedDescription,
    importFingerprint: transaction.importFingerprint,
  };
}

export function buildApprovedImportBatch(
  state: ImportReviewState,
  month?: string,
): PostImportBatchRequest {
  const approvedTransactions: ImportBatchTransaction[] = state.transactions
    .filter((transaction) => transaction.status === "approved")
    .flatMap((transaction) => {
      const splits = getActiveSplits(transaction);
      if (!splits) {
        return [toImportBatchTransaction(transaction)];
      }

      return splits.map((split) =>
        toImportBatchTransaction(transaction, {
          id: `${transaction.id}:${split.id}`,
          selectedCategory: split.category ?? "",
          editableAmount: split.amount,
        }),
      );
    });

  return {
    action: "importBatch",
    month,
    approvedTransactions,
  };
}

export function startSubmission(state: ImportReviewState): ImportReviewState {
  return {
    ...state,
    submission: {
      isSubmitting: true,
      error: null,
      successMessage: null,
    },
  };
}

export function failSubmission(
  state: ImportReviewState,
  message: string,
): ImportReviewState {
  return {
    ...state,
    submission: {
      isSubmitting: false,
      error: message,
      successMessage: null,
    },
  };
}

export function finishSubmission(
  state: ImportReviewState,
  written: { expenses: number; income: number },
): ImportReviewState {
  return {
    ...state,
    submission: {
      isSubmitting: false,
      error: null,
      successMessage: `Imported ${written.expenses + written.income} transactions successfully.`,
    },
  };
}