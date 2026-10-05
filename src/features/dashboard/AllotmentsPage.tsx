import { useEffect, useMemo, useRef, useState } from "react";
import { LoadingIndicator } from "../../components/LoadingIndicator";
import { CategoryAllotments } from "./CategoryAllotments";
import { CategoryBudgetCard } from "./CategoryBudgetCard";
import { MonthSelector } from "./MonthSelector";
import { SummaryCards } from "./SummaryCards";
import {
  calculateAllotmentCategoryCards,
  calculateAllotmentSummary,
  calculateMonthProfit,
  collectAvailableMonths,
  filterExpensesByMonth,
  fundedExpenseTotal,
  getCurrentMonth,
  linkedExpensesForMonth,
  meaningfulProfit,
  previousMonth,
  stillFree,
} from "./dashboardCalculations";
import {
  createDashboardDataSource,
  type DashboardDataSource,
} from "./dashboardDataSource";
import { formatCurrency, formatMonthLabel } from "./format";
import type { Allotment, AllotmentDraft, DashboardData } from "./types";

type AllotmentsPageProps = {
  dataSource?: DashboardDataSource;
};

type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  return promise.then(
    (value) => ({ ok: true, value }),
    (error: unknown) => ({ ok: false, error }),
  );
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function withResolvedLinks(allotment: Allotment, expenses: DashboardData["expenses"], spendingMonth: string): Allotment {
  const expenseIds = linkedExpensesForMonth([allotment], expenses, spendingMonth)
    .map((expense) => expense.id)
    .filter((id): id is string => Boolean(id));
  if (expenseIds.length === allotment.expenseIds.length) {
    return allotment;
  }

  return { ...allotment, expenseIds };
}

export function AllotmentsPage({ dataSource }: Readonly<AllotmentsPageProps>) {
  const resolvedDataSource = useMemo(
    () => dataSource ?? createDashboardDataSource(),
    [dataSource],
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonth());
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [priorData, setPriorData] = useState<DashboardData | null>(null);
  const [poolAllotments, setPoolAllotments] = useState<Allotment[]>([]);
  const [sourceAllotments, setSourceAllotments] = useState<Allotment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorError, setPriorError] = useState<string | null>(null);
  const [allotmentError, setAllotmentError] = useState<string | null>(null);
  const [isSavingAllotment, setIsSavingAllotment] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const selectedMonthRef = useRef(selectedMonth);
  selectedMonthRef.current = selectedMonth;

  useEffect(() => {
    let active = true;
    const poolMonth = previousMonth(selectedMonth);
    const sourceMonth = previousMonth(poolMonth);
    setIsLoading(true);
    setError(null);
    setPriorError(null);
    setAllotmentError(null);

    Promise.all([
      settle(resolvedDataSource.getDashboardData(selectedMonth)),
      settle(resolvedDataSource.getDashboardData(poolMonth)),
      settle(resolvedDataSource.getAllotments(poolMonth)),
      settle(resolvedDataSource.getAllotments(sourceMonth)),
    ]).then(([dashboardResult, priorResult, poolResult, sourceResult]) => {
      if (!active) {
        return;
      }

      if (!dashboardResult.ok) {
        setError(messageFrom(dashboardResult.error, "Unable to load allotments."));
        setIsLoading(false);
        return;
      }

      const spendingExpenses = dashboardResult.value.expenses;
      const pool = poolResult.ok
        ? poolResult.value.map((allotment) => withResolvedLinks(allotment, spendingExpenses, selectedMonth))
        : [];
      const source = sourceResult.ok
        ? sourceResult.value.map((allotment) =>
            withResolvedLinks(
              allotment,
              priorResult.ok ? priorResult.value.expenses : [],
              poolMonth,
            ),
          )
        : [];

      setDashboardData(dashboardResult.value);
      setLoadedMonth(selectedMonth);
      setPriorData(priorResult.ok ? priorResult.value : null);
      setPriorError(priorResult.ok ? null : messageFrom(priorResult.error, "Unable to load last month."));
      setPoolAllotments(pool);
      setSourceAllotments(source);
      if (!poolResult.ok) {
        setAllotmentError(messageFrom(poolResult.error, "Unable to load allotments."));
      } else if (!sourceResult.ok) {
        setAllotmentError(messageFrom(sourceResult.error, "Unable to load allotments."));
      } else {
        setAllotmentError(null);
      }
      setIsLoading(false);

      const dirty = [
        ...(poolResult.ok ? pool.filter((allotment, index) => allotment !== poolResult.value[index]) : []),
        ...(sourceResult.ok && priorResult.ok
          ? source.filter((allotment, index) => allotment !== sourceResult.value[index])
          : []),
      ];
      for (const allotment of dirty) {
        void resolvedDataSource.saveAllotment(allotment);
      }
    });

    return () => {
      active = false;
    };
  }, [reloadToken, resolvedDataSource, selectedMonth]);

  const displayedMonth = loadedMonth ?? selectedMonth;
  const poolMonth = previousMonth(displayedMonth);

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

  const summary = useMemo(() => {
    if (!dashboardData || !loadedMonth) {
      return null;
    }

    return calculateAllotmentSummary(loadedMonth, dashboardData.expenses, dashboardData.income, poolAllotments);
  }, [dashboardData, loadedMonth, poolAllotments]);

  const cards = useMemo(() => {
    if (!dashboardData || !loadedMonth) {
      return [];
    }

    return calculateAllotmentCategoryCards(
      dashboardData.expenseCategories,
      dashboardData.budgetTargets,
      dashboardData.expenses,
      loadedMonth,
      poolAllotments,
    );
  }, [dashboardData, loadedMonth, poolAllotments]);

  const toWorkWith = useMemo(() => {
    if (!priorData) {
      return null;
    }

    const actual = calculateMonthProfit(poolMonth, priorData.expenses, priorData.income);
    return meaningfulProfit(actual, fundedExpenseTotal(sourceAllotments, priorData.expenses, poolMonth));
  }, [poolMonth, priorData, sourceAllotments]);

  const free = toWorkWith === null ? null : stillFree(toWorkWith, poolAllotments);
  const spendingExpenses = useMemo(() => {
    if (!dashboardData || !loadedMonth) {
      return [];
    }

    return filterExpensesByMonth(dashboardData.expenses, loadedMonth);
  }, [dashboardData, loadedMonth]);
  const allotted = useMemo(
    () => poolAllotments.reduce((sum, allotment) => sum + allotment.amount, 0),
    [poolAllotments],
  );
  const fulfilled = useMemo(() => {
    if (!loadedMonth) {
      return 0;
    }

    return fundedExpenseTotal(poolAllotments, spendingExpenses, loadedMonth);
  }, [loadedMonth, poolAllotments, spendingExpenses]);

  const persistAllotment = (draft: AllotmentDraft) => {
    setIsSavingAllotment(true);
    setAllotmentError(null);

    return resolvedDataSource
      .saveAllotment(draft)
      .then((saved) => {
        if (saved.profitMonth !== previousMonth(selectedMonthRef.current)) {
          return;
        }

        setPoolAllotments((current) => {
          const index = current.findIndex((allotment) => allotment.id === saved.id);
          if (index < 0) {
            return [...current, saved];
          }

          return current.map((allotment) => (allotment.id === saved.id ? saved : allotment));
        });
      })
      .catch((saveError: unknown) => {
        setAllotmentError(messageFrom(saveError, "Unable to save allotment."));
      })
      .finally(() => {
        setIsSavingAllotment(false);
      });
  };

  const retryLoad = () => {
    setReloadToken((value) => value + 1);
  };

  if (!dashboardData || !loadedMonth || !summary) {
    if (isLoading) {
      return (
        <main className="dashboard-page">
          <LoadingIndicator label="Loading allotments" centered />
        </main>
      );
    }

    return (
      <main className="dashboard-page">
        <section className="dashboard-error" role="alert">
          <h1>Allotments unavailable</h1>
          <p>{error ?? "No allotment data was returned."}</p>
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
          <p className="dashboard-eyebrow">Allotments dashboard</p>
          <h1>{formatMonthLabel(loadedMonth)}</h1>
        </div>
        <div className="dashboard-hero__controls">
          {isLoading ? <LoadingIndicator label={`Loading ${formatMonthLabel(selectedMonth)}`} /> : null}
          <MonthSelector selectedMonth={selectedMonth} months={months} onChange={setSelectedMonth} />
        </div>
        <p className="allotments-intro">
          Use last month&apos;s profit for purchases you plan to make this month. Set an amount for each purchase, then
          link the expense after you pay.
        </p>
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

      <SummaryCards
        summary={summary}
        profitLabel="Meaningful profit"
        profitTooltip="Meaningful profit for a month is that month's actual profit plus the purchases recorded in that month and funded by an earlier month's profit."
      />

      <section className="working-capital" aria-label="To work with">
        <p className="dashboard-eyebrow">To work with</p>
        {priorError ? (
          <p className="dashboard-error" role="alert">
            Could not load {formatMonthLabel(poolMonth)} meaningful profit. {priorError}
          </p>
        ) : toWorkWith === null ? (
          <p className="dashboard-muted">Loading {formatMonthLabel(poolMonth)} meaningful profit</p>
        ) : (
          <p className={toWorkWith < 0 ? "working-capital__amount summary-card__negative" : "working-capital__amount"}>
            {formatCurrency(toWorkWith)}
          </p>
        )}
        <p className="dashboard-muted">
          {formatMonthLabel(poolMonth)} meaningful profit. Unspent profit does not carry past this month.
        </p>
        <div className="working-capital__breakdown">
          <div>
            <span>Allotted</span>
            <strong>{formatCurrency(allotted)}</strong>
          </div>
          <div>
            <span>Fulfilled</span>
            <strong className={fulfilled > allotted ? "summary-card__negative" : undefined}>
              {formatCurrency(fulfilled)}
            </strong>
          </div>
          {free !== null ? (
            <div>
              <span>Still free</span>
              <strong className={free < 0 ? "summary-card__negative" : undefined}>{formatCurrency(free)}</strong>
            </div>
          ) : null}
        </div>
        {allotted > 0 ? (
          <div
            className="allotment__meter working-capital__meter"
            role="meter"
            aria-label="Allotments fulfilled"
            aria-valuemin={0}
            aria-valuemax={Math.max(allotted, fulfilled)}
            aria-valuenow={Math.max(0, fulfilled)}
          >
            <div
              className={
                fulfilled > allotted ? "allotment__meter-fill allotment__meter-fill--over" : "allotment__meter-fill"
              }
              style={{ width: `${allotted > 0 ? Math.min(100, (Math.max(0, fulfilled) / allotted) * 100) : 0}%` }}
            />
          </div>
        ) : null}
        {fulfilled > allotted ? (
          <p className="working-capital__over">Over the plans by {formatCurrency(fulfilled - allotted)}</p>
        ) : null}
        {allotmentError ? (
          <p className="dashboard-error" role="alert">
            {allotmentError}
          </p>
        ) : null}
      </section>

      <section className="category-grid category-grid--allotments" aria-label="Expense category cards">
        {cards.map((card) => (
          <CategoryBudgetCard key={card.category} card={card}>
            <CategoryAllotments
              category={card.category}
              allotments={poolAllotments.filter((allotment) => allotment.category === card.category)}
              expenses={spendingExpenses.filter((expense) => expense.category === card.category)}
              isSaving={isSavingAllotment}
              onAdd={(name, amount) =>
                persistAllotment({
                  profitMonth: poolMonth,
                  name,
                  amount,
                  category: card.category,
                  expenseIds: [],
                })
              }
              onDelete={(id) => {
                const profitMonth = poolMonth;
                setIsSavingAllotment(true);
                setAllotmentError(null);
                return resolvedDataSource
                  .deleteAllotment(id)
                  .then(() => {
                    setPoolAllotments((current) => {
                      if (profitMonth !== previousMonth(selectedMonthRef.current)) {
                        return current;
                      }

                      return current.filter((allotment) => allotment.id !== id);
                    });
                  })
                  .catch((deleteError: unknown) => {
                    setAllotmentError(messageFrom(deleteError, "Unable to remove allotment."));
                  })
                  .finally(() => {
                    setIsSavingAllotment(false);
                  });
              }}
              onLink={(allotment, expenseId) =>
                persistAllotment({
                  ...allotment,
                  expenseIds: allotment.expenseIds.includes(expenseId)
                    ? allotment.expenseIds
                    : [...allotment.expenseIds, expenseId],
                })
              }
              onUnlink={(allotment, expenseId) =>
                persistAllotment({
                  ...allotment,
                  expenseIds: allotment.expenseIds.filter((id) => id !== expenseId),
                })
              }
            />
          </CategoryBudgetCard>
        ))}
      </section>

      {cards.length === 0 ? <p className="dashboard-muted">No expense categories were provided.</p> : null}
    </main>
  );
}
