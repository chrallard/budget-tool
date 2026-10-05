import { useMemo, useState } from "react";
import { LoadingIndicator } from "../../components/LoadingIndicator";
import type { ApiAllotment } from "../../api/client";
import type { ImportParserError } from "../../lib/import/types";
import { parseBankCsv } from "./parser/bankParser";
import { CsvUpload } from "./CsvUpload";
import {
  createImportDataSource,
  type ImportDataSource,
  type ImportReviewContext,
} from "./importDataSource";
import { ImportProgress } from "./ImportProgress";
import { SubmitImportBatchButton } from "./SubmitImportBatchButton";
import { profitMonthsForExpenses } from "./matchingAllotments";
import { TransactionReviewCard } from "./TransactionReviewCard";
import {
  addTransactionSplit,
  approveTransaction,
  buildApprovedImportBatch,
  clearTransactionSplit,
  createImportReviewState,
  failSubmission,
  finishSubmission,
  getCurrentTransaction,
  getReviewCounts,
  ignoreTransaction,
  removeTransactionSplit,
  reopenTransaction,
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
  type ImportReviewState,
} from "./reviewState";

type ImportPageProps = {
  dataSource?: ImportDataSource;
  onImportSuccess?: () => void;
  month?: string;
};

function isParserError(error: unknown): error is ImportParserError {
  return error instanceof Error && error.name === "ImportParserError";
}

function toErrorMessage(error: unknown): string {
  if (isParserError(error)) {
    return error.message;
  }

  return error instanceof Error ? error.message : "Unexpected import error.";
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    file.arrayBuffer().then((buffer) => {
      resolve(new TextDecoder().decode(buffer));
    }).catch(() => {
      reject(new Error("Unable to read the selected file."));
    });
  });
}

function ReviewedTransactionList({
  state,
  onReopen,
}: Readonly<{
  state: ImportReviewState;
  onReopen: (transactionId: string) => void;
}>) {
  const reviewedTransactions = state.transactions.filter((transaction) => transaction.status !== "pending");

  if (reviewedTransactions.length === 0) {
    return null;
  }

  return (
    <section className="import-panel" aria-label="Reviewed transactions">
      <h2>Reviewed transactions</h2>
      <ul className="reviewed-list">
        {reviewedTransactions.map((transaction) => (
          <li key={transaction.id}>
            <div>
              <strong>{transaction.originalDescription}</strong>
              <span>{transaction.status}</span>
            </div>
            <button type="button" className="ghost-button" onClick={() => onReopen(transaction.id)}>
              Reopen
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ImportPage({
  dataSource,
  onImportSuccess,
  month,
}: Readonly<ImportPageProps>) {
  const resolvedDataSource = useMemo(
    () => dataSource ?? createImportDataSource(),
    [dataSource],
  );
  const [contextError, setContextError] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ImportReviewState | null>(null);
  const [previouslySkippedCount, setPreviouslySkippedCount] = useState(0);

  const counts = useMemo(() => (reviewState ? getReviewCounts(reviewState) : null), [reviewState]);
  const currentTransaction = useMemo(() => (reviewState ? getCurrentTransaction(reviewState) : null), [reviewState]);

  async function handleFileSelected(file: File) {
    setPageMessage(null);
    setContextError(null);
    setIsLoadingContext(true);

    try {
      let nextContext: ImportReviewContext;
      try {
        nextContext = await resolvedDataSource.getImportReviewContext();
      } catch (error) {
        setReviewState(null);
        setContextError(toErrorMessage(error));
        return;
      }

      const text = await readFileText(file);
      const parsed = parseBankCsv(text, {
        expenseCategories: nextContext.expenseCategories,
        incomeCategories: nextContext.incomeCategories,
        existingRecords: nextContext.existingRecords,
      });
      const rememberedFingerprints = nextContext.skippedFingerprints ?? [];
      const remembered = new Set(rememberedFingerprints);
      let allotments: ApiAllotment[] = [];
      try {
        const profitMonths = profitMonthsForExpenses(
          parsed.transactions
            .filter((transaction) => transaction.direction === "expense")
            .map((transaction) => transaction.displayDate),
        );
        const groups = await Promise.all(
          profitMonths.map((profitMonth) => resolvedDataSource.getAllotments(profitMonth)),
        );
        allotments = groups.flat();
      } catch (error) {
        setPageMessage(
          `Allotments could not be loaded. You can still import without linking them. ${toErrorMessage(error)}`,
        );
      }

      setPreviouslySkippedCount(
        parsed.transactions.filter((transaction) => remembered.has(transaction.importFingerprint)).length,
      );
      setReviewState(
        createImportReviewState({
          sourceAccount: parsed.sourceAccount,
          transactions: parsed.transactions,
          config: {
            expenseCategories: nextContext.expenseCategories,
            incomeCategories: nextContext.incomeCategories,
          },
          fileName: file.name,
          rememberedFingerprints,
          allotments,
        }),
      );
    } catch (error) {
      setReviewState(null);
      setPageMessage(toErrorMessage(error));
    } finally {
      setIsLoadingContext(false);
    }
  }

  async function handleSubmit() {
    if (!reviewState) {
      return;
    }

    const submittingState = startSubmission(reviewState);
    setReviewState(submittingState);

    try {
      const payload = buildApprovedImportBatch(submittingState, month);
      const response = await resolvedDataSource.submitImportBatch(payload);

      if (response.failures.length > 0) {
        setReviewState(
          failSubmission(
            submittingState,
            `Import failed for ${response.failures.length} transaction${response.failures.length === 1 ? "" : "s"}.`,
          ),
        );
        return;
      }

      const completedState = finishSubmission(submittingState, response.written);
      setPageMessage(completedState.submission.successMessage);
      setReviewState(null);
      onImportSuccess?.();
    } catch (error) {
      setReviewState(failSubmission(submittingState, toErrorMessage(error)));
    }
  }

  return (
    <main className="import-page">
      <CsvUpload disabled={isLoadingContext} onFileSelected={handleFileSelected} />

      {isLoadingContext ? (
        <LoadingIndicator label="Preparing import" />
      ) : null}
      {contextError ? (
        <section className="dashboard-error" role="alert">
          <h2>Import unavailable</h2>
          <p>{contextError}</p>
        </section>
      ) : null}
      {pageMessage ? (
        <section className="import-feedback" role="alert">
          <p>{pageMessage}</p>
        </section>
      ) : null}

      {reviewState && counts ? (
        <div className="content-fade-in">
          <ImportProgress fileName={reviewState.fileName} sourceAccount={reviewState.sourceAccount} counts={counts} />

          {currentTransaction ? (
            <TransactionReviewCard
              transaction={currentTransaction}
              config={reviewState.config}
              allotments={reviewState.allotments}
              onCategoryChange={(category) =>
                setReviewState((state) => (state ? setTransactionCategory(state, currentTransaction.id, category) : state))
              }
              onAllotmentChange={(allotmentId) =>
                setReviewState((state) =>
                  state ? setTransactionAllotment(state, currentTransaction.id, allotmentId) : state,
                )
              }
              onAmountChange={(amount) =>
                setReviewState((state) => (state ? setTransactionAmount(state, currentTransaction.id, amount) : state))
              }
              onDisplayNameOverrideChange={(value) =>
                setReviewState((state) =>
                  state ? setTransactionDisplayNameOverride(state, currentTransaction.id, value) : state,
                )
              }
              onNotesChange={(notes) =>
                setReviewState((state) => (state ? setTransactionNotes(state, currentTransaction.id, notes) : state))
              }
              onStartSplit={() =>
                setReviewState((state) => (state ? startTransactionSplit(state, currentTransaction.id) : state))
              }
              onAddSplit={() =>
                setReviewState((state) => (state ? addTransactionSplit(state, currentTransaction.id) : state))
              }
              onRemoveSplit={(splitId) =>
                setReviewState((state) =>
                  state ? removeTransactionSplit(state, currentTransaction.id, splitId) : state,
                )
              }
              onClearSplit={() =>
                setReviewState((state) => (state ? clearTransactionSplit(state, currentTransaction.id) : state))
              }
              onSplitAmountChange={(splitId, amount) =>
                setReviewState((state) =>
                  state ? setSplitAmount(state, currentTransaction.id, splitId, amount) : state,
                )
              }
              onSplitCategoryChange={(splitId, category) =>
                setReviewState((state) =>
                  state ? setSplitCategory(state, currentTransaction.id, splitId, category) : state,
                )
              }
              onSplitAllotmentChange={(splitId, allotmentId) =>
                setReviewState((state) =>
                  state ? setSplitAllotment(state, currentTransaction.id, splitId, allotmentId) : state,
                )
              }
              onApprove={() =>
                setReviewState((state) => (state ? approveTransaction(state, currentTransaction.id) : state))
              }
              onSkip={() =>
                setReviewState((state) => (state ? skipTransaction(state, currentTransaction.id) : state))
              }
              onIgnore={(reason) =>
                setReviewState((state) => (state ? ignoreTransaction(state, currentTransaction.id, reason) : state))
              }
            />
          ) : (
            <section className="import-panel">
              <h2>Review complete</h2>
              <p className="dashboard-muted">All pending transactions have been reviewed. Submit the approved rows when ready.</p>
            </section>
          )}

          {previouslySkippedCount > 0 ? (
            <p className="dashboard-muted">
              {previouslySkippedCount} previously skipped transaction{previouslySkippedCount === 1 ? "" : "s"} left out of this review. Reopen one below to import it.
            </p>
          ) : null}

          {reviewState.submission.error ? (
            <section className="dashboard-error" role="alert">
              <h2>Submission failed</h2>
              <p>{reviewState.submission.error}</p>
            </section>
          ) : null}

          <SubmitImportBatchButton
            approvedCount={counts.approved}
            pendingCount={counts.pending}
            dismissedCount={counts.skipped + counts.ignored}
            disabled={
              counts.pending > 0 ||
              (counts.approved === 0 && counts.skipped === 0 && counts.ignored === 0) ||
              reviewState.submission.isSubmitting
            }
            isSubmitting={reviewState.submission.isSubmitting}
            onSubmit={handleSubmit}
          />

          <ReviewedTransactionList
            state={reviewState}
            onReopen={(transactionId) =>
              setReviewState((state) => (state ? reopenTransaction(state, transactionId) : state))
            }
          />
        </div>
      ) : null}
    </main>
  );
}