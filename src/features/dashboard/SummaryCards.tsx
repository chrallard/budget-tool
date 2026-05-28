import { formatCurrency } from "./format";
import type { DashboardSummary } from "./types";

type SummaryCardsProps = {
  summary: DashboardSummary;
};

export function SummaryCards({ summary }: Readonly<SummaryCardsProps>) {
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
        <h2>Remaining Expense Budget</h2>
        <p>
          {summary.totalRemainingExpenseBudget === undefined
            ? "No expense targets"
            : formatCurrency(summary.totalRemainingExpenseBudget)}
        </p>
      </article>
    </section>
  );
}
