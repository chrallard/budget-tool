import type {
  ImportBatchTransaction,
  PostImportBatchRequest,
} from "../../api/client";
import type {
  DuplicateStatus,
  IgnoreReason,
  NormalizedTransaction,
  TransactionDirection,
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

  return {
    ...transaction,
    selectedCategory: selectedCategory ?? suggestedCategory,
    suggestedCategory,
  };
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

export function canApproveTransaction(
  transaction: NormalizedTransaction,
  config: ReviewConfig,
): boolean {
  return (
    transaction.displayDate.trim().length > 0 &&
    transaction.originalDescription.trim().length > 0 &&
    Number.isFinite(transaction.editableAmount) &&
    transaction.editableAmount !== 0 &&
    isValidCategory(transaction.selectedCategory, transaction.direction, config)
  );
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

export function buildApprovedImportBatch(
  state: ImportReviewState,
  month?: string,
): PostImportBatchRequest {
  const approvedTransactions: ImportBatchTransaction[] = state.transactions
    .filter((transaction) => transaction.status === "approved")
    .map((transaction) => ({
      id: transaction.id,
      direction: transaction.direction,
      displayDate: transaction.displayDate,
      selectedCategory: transaction.selectedCategory ?? "",
      editableAmount: transaction.editableAmount,
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
    }));

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