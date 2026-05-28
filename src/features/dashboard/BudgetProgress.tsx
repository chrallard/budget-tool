type BudgetProgressProps = {
  progressPct?: number;
  isOverBudget: boolean;
};

export function BudgetProgress({ progressPct, isOverBudget }: Readonly<BudgetProgressProps>) {
  if (progressPct === undefined) {
    return <p className="dashboard-muted">No target set</p>;
  }

  const clamped = Math.max(0, Math.min(progressPct, 100));

  return (
    <div className="budget-progress" aria-label={`Progress ${Math.round(progressPct)} percent`}>
      <div
        className={`budget-progress__bar ${isOverBudget ? "budget-progress__bar--over" : ""}`}
        style={{ width: `${clamped}%` }}
      />
      <span className="budget-progress__label">{Math.round(progressPct)}%</span>
    </div>
  );
}
