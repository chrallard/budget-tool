import { formatCurrency } from "./format";
import type { DashboardSummary } from "./types";

type SummaryCardsProps = {
  summary: DashboardSummary;
  profitLabel?: string;
  profitTooltip?: string;
};

export function SummaryCards({ summary, profitLabel = "Profit", profitTooltip }: Readonly<SummaryCardsProps>) {
  return (
    <section className="summary-grid" aria-label="Monthly summaries">
      <article className="summary-card">
        <h2>Total Spending</h2>
        <p>{formatCurrency(summary.totalSpending)}</p>
      </article>
      <article className="summary-card">
        <h2>Total Income</h2>
        <p>{formatCurrency(summary.totalIncome)}</p>
      </article>
      <article className="summary-card">
        <h2>
          {profitTooltip ? (
            <button type="button" className="summary-card__term" aria-describedby="meaningful-profit-definition">
              {profitLabel}
            </button>
          ) : (
            profitLabel
          )}
        </h2>
        <p>{formatCurrency(summary.profit)}</p>
        {profitTooltip ? (
          <p id="meaningful-profit-definition" className="summary-card__tooltip" role="tooltip">
            {profitTooltip}
          </p>
        ) : null}
      </article>
    </section>
  );
}
