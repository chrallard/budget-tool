import { BudgetProgress } from "./BudgetProgress";
import { formatCurrency } from "./format";
import type { CategoryCardData } from "./types";

type CategoryBudgetCardProps = {
  card: CategoryCardData;
  onClick?: () => void;
};

export function CategoryBudgetCard({ card, onClick }: Readonly<CategoryBudgetCardProps>) {
  const budgetLabel = card.budgetTarget === undefined ? "No target" : formatCurrency(card.budgetTarget);
  const remainingLabel = card.remaining === undefined ? "No target" : formatCurrency(card.remaining);
  const content = (
    <>
      <h3>{card.category}</h3>
      <div className="category-card__figures">
        <div className="category-card__budget">
          <span>Budget</span>
          <strong>{budgetLabel}</strong>
        </div>
        <div>
          <span>Spent</span>
          <strong>{formatCurrency(card.used)}</strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong className={card.isOverBudget ? "category-card__negative" : undefined}>{remainingLabel}</strong>
        </div>
      </div>
      {card.budgetTarget === undefined ? null : (
        <BudgetProgress progressPct={card.progressPct} isOverBudget={card.isOverBudget} />
      )}
    </>
  );

  const className = `category-card${onClick ? " category-card--button" : ""}${card.isOverBudget ? " category-card--over" : ""}`;

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <article className={className}>{content}</article>;
}
