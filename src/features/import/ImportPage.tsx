import { useEffect, useMemo, useState } from "react";
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
import { TransactionReviewCard } from "./TransactionReviewCard";
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
  setTransactionDisplayNameOverride,
  setTransactionNotes,
  skipTransaction,
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
  const [context, setContext] = useState<ImportReviewContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ImportReviewState | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoadingContext(true);
    setContextError(null);

    resolvedDataSource
      .getImportReviewContext()
      .then((nextContext) => {
        if (!active) {
          return;
        }

        setContext(nextContext);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setContextError(toErrorMessage(error));
      })
      .finally(() => {
        if (active) {
          setIsLoadingContext(false);
        }
      });

    return () => {
      active = false;
    };
  }, [resolvedDataSource]);

  const counts = useMemo(() => (reviewState ? getReviewCounts(reviewState) : null), [reviewState]);
  const currentTransaction = useMemo(() => (reviewState ? getCurrentTransaction(reviewState) : null), [reviewState]);

  async function handleFileSelected(file: File) {
    if (!context) {
      return;
    }

    setPageMessage(null);

    try {
      const text = await readFileText(file);
      const parsed = parseBankCsv(text, {
        expenseCategories: context.expenseCategories,
        incomeCategories: context.incomeCategories,
        existingRecords: context.existingRecords,
      });

      setReviewState(
        createImportReviewState({
          sourceAccount: parsed.sourceAccount,
          transactions: parsed.transactions,
          config: {
            expenseCategories: context.expenseCategories,
            incomeCategories: context.incomeCategories,
          },
          fileName: file.name,
        }),
      );
    } catch (error) {
      setReviewState(null);
      setPageMessage(toErrorMessage(error));
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

      {isLoadingContext ? <p className="dashboard-muted">Loading categories and duplicate metadata...</p> : null}
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
        <>
          <ImportProgress fileName={reviewState.fileName} sourceAccount={reviewState.sourceAccount} counts={counts} />

          {currentTransaction ? (
            <TransactionReviewCard
              transaction={currentTransaction}
              config={reviewState.config}
              onCategoryChange={(category) =>
                setReviewState((state) => (state ? setTransactionCategory(state, currentTransaction.id, category) : state))
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

          {reviewState.submission.error ? (
            <section className="dashboard-error" role="alert">
              <h2>Submission failed</h2>
              <p>{reviewState.submission.error}</p>
            </section>
          ) : null}

          <SubmitImportBatchButton
            approvedCount={counts.approved}
            pendingCount={counts.pending}
            disabled={counts.pending > 0 || counts.approved === 0 || reviewState.submission.isSubmitting}
            isSubmitting={reviewState.submission.isSubmitting}
            onSubmit={handleSubmit}
          />

          <ReviewedTransactionList
            state={reviewState}
            onReopen={(transactionId) =>
              setReviewState((state) => (state ? reopenTransaction(state, transactionId) : state))
            }
          />
        </>
      ) : null}
    </main>
  );
}