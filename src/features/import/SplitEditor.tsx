import type { ApiAllotment } from "../../api/client";
import type { NormalizedTransaction, TransactionSplit } from "../../shared/types/transactions";
import { AllotmentLinkField } from "./AllotmentLinkField";
import { CategorySelector } from "./CategorySelector";
import { getSplitRemaining } from "./reviewState";

type SplitEditorProps = {
  transaction: NormalizedTransaction;
  categories: string[];
  splits: TransactionSplit[];
  allotments?: ApiAllotment[];
  onAmountChange: (splitId: string, amount: number) => void;
  onCategoryChange: (splitId: string, category: string) => void;
  onAllotmentChange?: (splitId: string, allotmentId: string) => void;
  onAdd: () => void;
  onRemove: (splitId: string) => void;
  onClear: () => void;
};

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function SplitEditor({
  transaction,
  categories,
  splits,
  allotments = [],
  onAmountChange,
  onCategoryChange,
  onAllotmentChange,
  onAdd,
  onRemove,
  onClear,
}: Readonly<SplitEditorProps>) {
  const remaining = getSplitRemaining(transaction);
  const hasBlankAmount = splits.some((split) => !Number.isFinite(split.amount));

  return (
    <fieldset className="split-editor">
      <legend>Category split</legend>
      <p className="dashboard-muted">
        Divide this purchase across categories. The parts must add up to {formatMoney(transaction.editableAmount)}.
      </p>
      {splits.map((split, index) => {
        const part = index + 1;
        return (
          <div className="split-editor__row" key={split.id}>
            <label className="review-field">
              <span>Part {part} amount</span>
              <input
                aria-label={`Part ${part} amount`}
                type="number"
                step="0.01"
                value={Number.isFinite(split.amount) ? String(split.amount) : ""}
                onChange={(event) => onAmountChange(split.id, event.currentTarget.valueAsNumber)}
              />
            </label>
            <CategorySelector
              categories={categories}
              selectedCategory={split.category}
              label={`Part ${part} category`}
              onChange={(category) => onCategoryChange(split.id, category)}
            />
            <button
              type="button"
              className="ghost-button"
              onClick={() => onRemove(split.id)}
            >
              Remove part {part}
            </button>
            {transaction.direction === "expense" ? (
              <AllotmentLinkField
                layout="split"
                allotments={allotments}
                category={split.category}
                displayDate={transaction.displayDate}
                selectedId={split.allotmentId}
                label={`Part ${part} allotment`}
                onChange={(allotmentId) => onAllotmentChange?.(split.id, allotmentId)}
              />
            ) : null}
          </div>
        );
      })}
      <p className={!hasBlankAmount && remaining === 0 ? "dashboard-muted" : "transaction-card__validation"}>
        {hasBlankAmount ? "Enter an amount for each part." : `Remaining ${formatMoney(remaining)}`}
      </p>
      <div className="import-action-row">
        <button type="button" className="ghost-button" onClick={onAdd}>
          Add category
        </button>
        <button type="button" className="ghost-button" onClick={onClear}>
          Use one category
        </button>
      </div>
    </fieldset>
  );
}
