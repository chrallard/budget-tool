import { formatCurrency, formatMonthLabel } from "./format";

type WorkingCapitalProps = {
  month: string;
  profit: number | null;
  error: string | null;
};

export function WorkingCapital({ month, profit, error }: Readonly<WorkingCapitalProps>) {
  const monthLabel = formatMonthLabel(month);

  return (
    <section className="working-capital" aria-label={`${monthLabel} profit`}>
      <p className="dashboard-eyebrow">To work with</p>
      {error ? (
        <p className="dashboard-error" role="alert">
          Could not load {monthLabel} profit. {error}
        </p>
      ) : profit === null ? (
        <p className="dashboard-muted">Loading {monthLabel} profit</p>
      ) : (
        <p className={profit < 0 ? "working-capital__amount summary-card__negative" : "working-capital__amount"}>
          {formatCurrency(profit)}
        </p>
      )}
      <p className="dashboard-muted">{monthLabel} profit for spending, investing, or paying down the mortgage.</p>
    </section>
  );
}
