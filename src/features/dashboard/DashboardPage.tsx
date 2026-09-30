import { useEffect, useMemo, useState } from "react";
import { LoadingIndicator } from "../../components/LoadingIndicator";
import { CategoryBudgetCard } from "./CategoryBudgetCard";
import { MonthSelector } from "./MonthSelector";
import { SummaryCards } from "./SummaryCards";
import {
  calculateCategoryCards,
  calculateDashboardSummary,
  calculateMonthProfit,
  collectAvailableMonths,
  getCurrentMonth,
  previousMonth,
} from "./dashboardCalculations";
import { WorkingCapital } from "./WorkingCapital";
import {
  createDashboardDataSource,
  type DashboardDataSource,
} from "./dashboardDataSource";
import { formatMonthLabel } from "./format";
import type { DashboardData } from "./types";

type DashboardPageProps = {
  dataSource?: DashboardDataSource;
  onCategorySelected?: (category: string, month: string) => void;
  onDataLoaded?: (month: string, data: DashboardData) => void;
};

export function DashboardPage({
  dataSource,
  onCategorySelected,
  onDataLoaded,
}: Readonly<DashboardPageProps>) {
  const resolvedDataSource = useMemo(
    () => dataSource ?? createDashboardDataSource(),
    [dataSource],
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonth());
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [priorMonth, setPriorMonth] = useState<string>(() => previousMonth(getCurrentMonth()));
  const [priorProfit, setPriorProfit] = useState<number | null>(null);
  const [priorError, setPriorError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const monthBefore = previousMonth(selectedMonth);
    setIsLoading(true);
    setError(null);
    setPriorMonth(monthBefore);
    setPriorProfit(null);
    setPriorError(null);

    resolvedDataSource
      .getDashboardData(selectedMonth)
      .then((data) => {
        if (!active) {
          return;
        }

        setDashboardData(data);
        setLoadedMonth(selectedMonth);
        onDataLoaded?.(selectedMonth, data);

        resolvedDataSource
          .getDashboardData(monthBefore)
          .then((priorData) => {
            if (!active) {
              return;
            }

            setPriorProfit(calculateMonthProfit(monthBefore, priorData.expenses, priorData.income));
          })
          .catch((priorErr: unknown) => {
            if (!active) {
              return;
            }

            setPriorError(priorErr instanceof Error ? priorErr.message : "Unable to load last month.");
          });
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
  }, [onDataLoaded, reloadToken, resolvedDataSource, selectedMonth]);

  const displayedMonth = loadedMonth ?? selectedMonth;

  const months = useMemo(() => {
    let knownMonths = [displayedMonth];
    if (dashboardData?.availableMonths && dashboardData.availableMonths.length > 0) {
      knownMonths = dashboardData.availableMonths;
    } else if (dashboardData) {
      knownMonths = collectAvailableMonths(dashboardData.expenses, dashboardData.income, displayedMonth);
    }

    if (knownMonths.includes(selectedMonth)) {
      return knownMonths;
    }

    return [selectedMonth, ...knownMonths].sort((left, right) => right.localeCompare(left));
  }, [dashboardData, displayedMonth, selectedMonth]);

  const cards = useMemo(() => {
    if (!dashboardData || !loadedMonth) {
      return [];
    }

    return calculateCategoryCards(
      dashboardData.expenseCategories,
      dashboardData.budgetTargets,
      dashboardData.expenses,
      loadedMonth,
    );
  }, [dashboardData, loadedMonth]);

  const summary = useMemo(() => {
    if (!dashboardData || !loadedMonth) {
      return null;
    }

    return calculateDashboardSummary(loadedMonth, dashboardData.expenses, dashboardData.income, cards);
  }, [dashboardData, cards, loadedMonth]);

  const retryLoad = () => {
    setReloadToken((value) => value + 1);
  };

  if (!dashboardData || !loadedMonth || !summary) {
    if (isLoading) {
      return (
        <main className="dashboard-page">
          <LoadingIndicator label="Loading dashboard" centered />
        </main>
      );
    }

    return (
      <main className="dashboard-page">
        <section className="dashboard-error" role="alert">
          <h1>Dashboard unavailable</h1>
          <p>{error ?? "No dashboard data was returned."}</p>
          <p>Check API connectivity and retry.</p>
          <button type="button" className="primary-button" onClick={retryLoad}>
            Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page content-fade-in" style={{ overflowX: "hidden" }} aria-busy={isLoading}>
      <header className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Budget Dashboard</p>
          <h1>{formatMonthLabel(loadedMonth)}</h1>
        </div>
        <div className="dashboard-hero__controls">
          {isLoading ? <LoadingIndicator label={`Loading ${formatMonthLabel(selectedMonth)}`} /> : null}
          <MonthSelector selectedMonth={selectedMonth} months={months} onChange={setSelectedMonth} />
        </div>
      </header>

      {error ? (
        <section className="dashboard-error" role="alert">
          <h2>Could not load {formatMonthLabel(selectedMonth)}</h2>
          <p>{error}</p>
          <button type="button" className="primary-button" onClick={retryLoad}>
            Retry
          </button>
        </section>
      ) : null}

      <WorkingCapital month={priorMonth} profit={priorProfit} error={priorError} />

      <SummaryCards summary={summary} />

      <section className="category-grid" aria-label="Expense category cards">
        {cards.map((card) => (
          <CategoryBudgetCard
            key={card.category}
            card={card}
            onClick={
              onCategorySelected ? () => onCategorySelected(card.category, loadedMonth) : undefined
            }
          />
        ))}
      </section>

      {cards.length === 0 ? <p className="dashboard-muted">No expense categories were provided.</p> : null}
    </main>
  );
}
