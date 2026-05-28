import { BudgetProgress } from "./BudgetProgress";
import { formatCurrency } from "./format";
import type { CategoryCardData } from "./types";

type CategoryBudgetCardProps = {
  card: CategoryCardData;
};

export function CategoryBudgetCard({ card }: Readonly<CategoryBudgetCardProps>) {
  return (
    <article className={`category-card ${card.isOverBudget ? "category-card--over" : ""}`}>
      <header className="category-card__header">
        <h3>{card.category}</h3>
        {card.isOverBudget ? <span className="category-card__pill">Over budget</span> : null}
      </header>

      {card.budgetTarget === undefined ? (
        <p className="category-card__no-target">No budget target set for this category.</p>
      ) : (
        <p className="category-card__target">Budget: {formatCurrency(card.budgetTarget)}</p>
      )}

      <div className="category-card__stats">
        <div>
          <span className="category-card__label">Used</span>
          <strong>{formatCurrency(card.used)}</strong>
        </div>
        <div>
          <span className="category-card__label">Remaining</span>
          <strong className={card.isOverBudget ? "category-card__negative" : ""}>
            {card.remaining === undefined ? "No target" : formatCurrency(card.remaining)}
          </strong>
        </div>
      </div>

      <BudgetProgress progressPct={card.progressPct} isOverBudget={card.isOverBudget} />
    </article>
  );
}
