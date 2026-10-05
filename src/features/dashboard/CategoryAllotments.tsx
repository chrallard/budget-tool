import { useState } from "react";
import { formatCurrency } from "./format";
import type { Allotment, ExpenseRow } from "./types";

type CategoryAllotmentsProps = {
  category: string;
  allotments: Allotment[];
  expenses: ExpenseRow[];
  isSaving: boolean;
  onAdd: (name: string, amount: number) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onLink: (allotment: Allotment, expenseId: string) => void | Promise<void>;
  onUnlink: (allotment: Allotment, expenseId: string) => void | Promise<void>;
};

function parseAllotmentAmount(value: string): number | null {
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function expenseLabel(expense: ExpenseRow): string {
  return expense.vendor?.trim() || "Expense";
}

export function CategoryAllotments({
  category,
  allotments,
  expenses,
  isSaving,
  onAdd,
  onDelete,
  onLink,
  onUnlink,
}: Readonly<CategoryAllotmentsProps>) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const claimedIds = new Set(allotments.flatMap((allotment) => allotment.expenseIds));
  const available = expenses.filter((expense) => expense.id && !claimedIds.has(expense.id));

  const submitAllotment = () => {
    const parsedAmount = parseAllotmentAmount(amount);
    const trimmedName = name.trim();
    if (!trimmedName || parsedAmount === null) {
      setFormError("Enter a name and an amount greater than zero.");
      return;
    }

    setFormError(null);
    setName("");
    setAmount("");
    setIsAdding(false);
    return onAdd(trimmedName, parsedAmount);
  };

  return (
    <div className="category-card__allotments">
      {allotments.length > 0 ? (
        <ul className="allotment-list">
          {allotments.map((allotment) => {
            const linked = expenses.filter(
              (expense) => expense.id && allotment.expenseIds.includes(expense.id) && expense.category === category,
            );
            const linkedTotal = linked.reduce((sum, expense) => sum + expense.amount, 0);
            const remaining = Math.round((allotment.amount - linkedTotal) * 100) / 100;
            const usedPct = allotment.amount > 0 ? Math.min(100, (linkedTotal / allotment.amount) * 100) : 0;

            return (
              <li key={allotment.id} className="allotment">
                <div className="allotment__header">
                  <h4>{allotment.name}</h4>
                  <p className="allotment__plan">
                    <strong>{formatCurrency(allotment.amount)}</strong>
                    <span>Planned</span>
                  </p>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${allotment.name}`}
                    disabled={isSaving}
                    onClick={() => onDelete(allotment.id)}
                  >
                    ×
                  </button>
                </div>
                <p className={remaining < 0 ? "allotment__status category-card__negative" : "allotment__status"}>
                  {linked.length === 0
                    ? "Nothing linked yet"
                    : remaining < 0
                      ? `${formatCurrency(linkedTotal)} linked · Over the plan by ${formatCurrency(Math.abs(remaining))}`
                      : remaining > 0
                        ? `${formatCurrency(linkedTotal)} linked · ${formatCurrency(remaining)} still open`
                        : `${formatCurrency(linkedTotal)} linked`}
                </p>
                <div
                  className="allotment__meter"
                  role="meter"
                  aria-label={`${allotment.name} linked`}
                  aria-valuemin={0}
                  aria-valuemax={allotment.amount}
                  aria-valuenow={Math.max(0, linkedTotal)}
                >
                  <div
                    className={remaining < 0 ? "allotment__meter-fill allotment__meter-fill--over" : "allotment__meter-fill"}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                {linked.length > 0 ? (
                  <ul className="allotment__expenses">
                    {linked.map((expense) => (
                      <li key={expense.id} className="allotment__expense">
                        <span className="allotment__expense-name">{expenseLabel(expense)}</span>
                        <span className="allotment__expense-amount">{formatCurrency(expense.amount)}</span>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Unlink ${expenseLabel(expense)}`}
                          disabled={isSaving}
                          onClick={() => onUnlink(allotment, expense.id as string)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {available.length > 0 ? (
                  <select
                    aria-label={`Link expense to ${allotment.name}`}
                    value=""
                    disabled={isSaving}
                    onChange={(event) => {
                      const expenseId = event.target.value;
                      if (expenseId) {
                        return onLink(allotment, expenseId);
                      }
                    }}
                  >
                    <option value="">Link an expense</option>
                    {available.map((expense) => (
                      <option key={expense.id} value={expense.id}>
                        {expenseLabel(expense)} {formatCurrency(expense.amount)}
                      </option>
                    ))}
                  </select>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {isAdding ? (
        <form
          className="allotment-form"
          onSubmit={(event) => {
            event.preventDefault();
            return submitAllotment();
          }}
        >
          <input
            aria-label={`${category} allotment name`}
            placeholder="Name"
            value={name}
            disabled={isSaving}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            aria-label={`${category} allotment amount`}
            inputMode="decimal"
            placeholder="Amount"
            value={amount}
            disabled={isSaving}
            onChange={(event) => setAmount(event.target.value)}
          />
          <button
            type="submit"
            className="allotment-submit"
            aria-label={`Add ${category} allotment`}
            disabled={isSaving}
          >
            Add
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Cancel ${category} allotment`}
            disabled={isSaving}
            onClick={() => {
              setIsAdding(false);
              setFormError(null);
            }}
          >
            ×
          </button>
        </form>
      ) : (
        <button type="button" className="allotment-add" disabled={isSaving} onClick={() => setIsAdding(true)}>
          Add {category} allotment
        </button>
      )}
      {formError ? (
        <p className="dashboard-error" role="alert">
          {formError}
        </p>
      ) : null}
    </div>
  );
}
