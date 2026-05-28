import type { IgnoreReason, NormalizedTransaction } from "../../shared/types/transactions";
import { canApproveTransaction, getAllowedCategories, hasOutstandingDuplicates, type ReviewConfig } from "./reviewState";
import { CategorySelector } from "./CategorySelector";
import { DuplicateWarning } from "./DuplicateWarning";
import { IgnoreActions } from "./IgnoreActions";

type TransactionReviewCardProps = {
  transaction: NormalizedTransaction;
  config: ReviewConfig;
  onCategoryChange: (category: string) => void;
  onAmountChange: (amount: number) => void;
  onDisplayNameOverrideChange: (value: string) => void;
  onNotesChange: (notes: string) => void;
  onApprove: () => void;
  onSkip: () => void;
  onIgnore: (reason: IgnoreReason) => void;
};

function formatDirection(direction: NormalizedTransaction["direction"]): string {
  return direction === "expense" ? "Expense" : "Income";
}

export function TransactionReviewCard({
  transaction,
  config,
  onCategoryChange,
  onAmountChange,
  onDisplayNameOverrideChange,
  onNotesChange,
  onApprove,
  onSkip,
  onIgnore,
}: Readonly<TransactionReviewCardProps>) {
  const categories = getAllowedCategories(transaction.direction, config);
  const approvalBlocked = !canApproveTransaction(transaction, config);
  const nameFieldLabel = transaction.direction === "expense" ? "Store / Vendor" : "Source";
  const displayName = transaction.displayNameOverride?.trim()
    ? transaction.displayNameOverride.trim()
    : transaction.originalDescription;
  const hasDisplayNameOverride = displayName !== transaction.originalDescription;

  return (
    <article className="transaction-card" aria-label="Pending transaction review">
      <header className="transaction-card__header">
        <div>
          <p className="dashboard-eyebrow">{formatDirection(transaction.direction)}</p>
          <h2>{displayName}</h2>
          {hasDisplayNameOverride ? (
            <p className="dashboard-muted">Original: {transaction.originalDescription}</p>
          ) : null}
        </div>
        <div className="transaction-card__amounts">
          <strong>${transaction.editableAmount.toFixed(2)}</strong>
          <span>Original ${Math.abs(transaction.originalAmount).toFixed(2)}</span>
        </div>
      </header>

      {hasOutstandingDuplicates(transaction.duplicateStatus) ? (
        <DuplicateWarning transaction={transaction} onSkipDuplicate={onSkip} />
      ) : null}

      <dl className="transaction-card__meta">
        <div>
          <dt>Date</dt>
          <dd>{transaction.displayDate}</dd>
        </div>
        <div>
          <dt>Import fingerprint</dt>
          <dd>{transaction.importFingerprint}</dd>
        </div>
      </dl>

      <div className="transaction-card__fields">
        <label className="review-field">
          <span>Amount</span>
          <input
            aria-label="Amount"
            type="number"
            step="0.01"
            value={Number.isFinite(transaction.editableAmount) ? String(transaction.editableAmount) : ""}
            onChange={(event) => onAmountChange(event.currentTarget.valueAsNumber)}
          />
        </label>

        <label className="review-field review-field--full">
          <span>{nameFieldLabel}</span>
          <input
            aria-label={nameFieldLabel}
            type="text"
            value={transaction.displayNameOverride ?? ""}
            placeholder={transaction.originalDescription}
            onChange={(event) => onDisplayNameOverrideChange(event.currentTarget.value)}
          />
        </label>

        <CategorySelector
          categories={categories}
          selectedCategory={transaction.selectedCategory}
          onChange={onCategoryChange}
        />

        <label className="review-field review-field--full">
          <span>Notes</span>
          <textarea
            aria-label="Notes"
            rows={4}
            value={transaction.notes ?? ""}
            onChange={(event) => onNotesChange(event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="transaction-card__footer">
        <div>
          {transaction.suggestedCategory ? (
            <p className="dashboard-muted">Suggested category: {transaction.suggestedCategory}</p>
          ) : (
            <p className="dashboard-muted">No valid suggested category was found for this transaction.</p>
          )}
          {approvalBlocked ? (
            <p className="transaction-card__validation">Select a valid category and keep a valid amount before approval.</p>
          ) : null}
        </div>

        <div className="import-action-row">
          <button type="button" className="ghost-button" onClick={onSkip}>
            Skip transaction
          </button>
          <button type="button" className="primary-button" disabled={approvalBlocked} onClick={onApprove}>
            {transaction.duplicateStatus === "possible_duplicate" ? "Import anyway" : "Approve transaction"}
          </button>
        </div>
      </div>

      <IgnoreActions suggestedReason={transaction.ignoreReason} onIgnore={onIgnore} />
    </article>
  );
}