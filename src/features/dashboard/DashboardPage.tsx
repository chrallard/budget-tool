import { useEffect, useMemo, useState } from "react";
import { CategoryBudgetCard } from "./CategoryBudgetCard";
import { MonthSelector } from "./MonthSelector";
import { SummaryCards } from "./SummaryCards";
import {
  calculateCategoryCards,
  calculateDashboardSummary,
  collectAvailableMonths,
  getCurrentMonth,
} from "./dashboardCalculations";
import {
  createDashboardDataSource,
  type DashboardDataSource,
} from "./dashboardDataSource";
import { formatMonthLabel } from "./format";
import type { DashboardData } from "./types";

type DashboardPageProps = {
  dataSource?: DashboardDataSource;
};

export function DashboardPage({ dataSource }: Readonly<DashboardPageProps>) {
  const resolvedDataSource = useMemo(
    () => dataSource ?? createDashboardDataSource(),
    [dataSource],
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonth());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    resolvedDataSource
      .getDashboardData(selectedMonth)
      .then((data) => {
        if (!active) {
          return;
        }

        setDashboardData(data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [resolvedDataSource, selectedMonth]);

  const months = useMemo(() => {
    if (!dashboardData) {
      return [selectedMonth];
    }

    return collectAvailableMonths(dashboardData.expenses, dashboardData.income, selectedMonth);
  }, [dashboardData, selectedMonth]);

  const cards = useMemo(() => {
    if (!dashboardData) {
      return [];
    }

    return calculateCategoryCards(
      dashboardData.expenseCategories,
      dashboardData.budgetTargets,
      dashboardData.expenses,
      selectedMonth,
    );
  }, [dashboardData, selectedMonth]);

  const summary = useMemo(() => {
    if (!dashboardData) {
      return null;
    }

    return calculateDashboardSummary(selectedMonth, dashboardData.expenses, dashboardData.income, cards);
  }, [dashboardData, cards, selectedMonth]);

  if (isLoading) {
    return <main className="dashboard-page">Loading dashboard...</main>;
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-error" role="alert">
          <h1>Dashboard unavailable</h1>
          <p>{error}</p>
          <p>Check API connectivity and retry.</p>
        </section>
      </main>
    );
  }

  if (!dashboardData || !summary) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-error" role="alert">
          <h1>Dashboard unavailable</h1>
          <p>No dashboard data was returned.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page" style={{ overflowX: "hidden" }}>
      <header className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Budget Dashboard</p>
          <h1>{formatMonthLabel(selectedMonth)}</h1>
        </div>
        <MonthSelector selectedMonth={selectedMonth} months={months} onChange={setSelectedMonth} />
      </header>

      <SummaryCards summary={summary} />

      <section className="category-grid" aria-label="Expense category cards">
        {cards.map((card) => (
          <CategoryBudgetCard key={card.category} card={card} />
        ))}
      </section>

      {cards.length === 0 ? <p className="dashboard-muted">No expense categories were provided.</p> : null}
    </main>
  );
}
