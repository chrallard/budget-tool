import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "./format";
import {
  createDashboardDataSource,
  type DashboardDataSource,
} from "./dashboardDataSource";
import type { DashboardData, ExpenseRow, IncomeRow } from "./types";

type CategoryTransactionsPageProps = {
  category: string;
  month: string;
  onBack: () => void;
  dataSource?: DashboardDataSource;
  initialDashboardData?: DashboardData | null;
};

type DisplayTransaction = {
  date: string;
  vendor: string;
  amount: number;
  notes?: string;
  type: "expense" | "income";
};

export function CategoryTransactionsPage({
  category,
  month,
  onBack,
  dataSource,
  initialDashboardData,
}: Readonly<CategoryTransactionsPageProps>) {
  const resolvedDataSource = useMemo(
    () => dataSource ?? createDashboardDataSource(),
    [dataSource],
  );
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    initialDashboardData && initialDashboardData.month === month ? initialDashboardData : null,
  );
  const [isLoading, setIsLoading] = useState(
    !(initialDashboardData && initialDashboardData.month === month),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDashboardData && initialDashboardData.month === month) {
      setDashboardData(initialDashboardData);
      setError(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    resolvedDataSource
      .getDashboardData(month)
      .then((data) => {
        if (!active) return;
        setDashboardData(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load transaction data.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialDashboardData, resolvedDataSource, month]);

  const transactions = useMemo(() => {
    if (!dashboardData) return [];

    const results: DisplayTransaction[] = [];

    // Convert month from YYYY-MM to MM for filtering MM-DD-YYYY dates
    const [year, monthNum] = month.split('-');
    const datePrefix = `${monthNum}-`; // e.g., "05-" for May
    const normalizedCategory = category.trim().toLowerCase();

    // Filter expenses by category and month
    dashboardData.expenses
      .filter((exp) => exp.date.startsWith(datePrefix) && exp.date.endsWith(year) && exp.category.trim().toLowerCase() === normalizedCategory)
      .forEach((exp: ExpenseRow) => {
        results.push({
          date: exp.date,
          vendor: exp.vendor || "—",
          amount: exp.amount,
          notes: exp.notes,
          type: "expense",
        });
      });

    // Filter income by category and month
    dashboardData.income
      .filter((inc) => inc.date.startsWith(datePrefix) && inc.date.endsWith(year) && inc.category.trim().toLowerCase() === normalizedCategory)
      .forEach((inc: IncomeRow) => {
        results.push({
          date: inc.date,
          vendor: inc.source || "—",
          amount: inc.amount,
          notes: inc.notes,
          type: "income",
        });
      });

    // Sort by date descending (convert MM-DD-YYYY to comparable format)
    return results.sort((a, b) => {
      const dateA = new Date(a.date.split('-').reverse().join('-'));
      const dateB = new Date(b.date.split('-').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });
  }, [dashboardData, category, month]);

  const totals = useMemo(() => {
    let expenses = 0;
    let income = 0;

    transactions.forEach((txn) => {
      if (txn.type === "expense") {
        expenses += txn.amount;
      } else {
        income += txn.amount;
      }
    });

    return { expenses, income, net: income - expenses };
  }, [transactions]);

  if (isLoading) {
    return (
      <main className="category-transactions-page">
        <p>Loading transactions...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="category-transactions-page">
        <header className="category-transactions-header">
          <button type="button" onClick={onBack} className="back-button">
            ← Back to Dashboard
          </button>
        </header>
        <section className="dashboard-error" role="alert">
          <h1>Unable to load transactions</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  return (
    <div className="category-transactions-page">
      <header className="category-transactions-header">
        <button type="button" onClick={onBack} className="back-button">
          ← Back to Dashboard
        </button>
        <div>
          <h2 className="category-transactions-title">{category}</h2>
          <p className="category-transactions-subtitle">{month}</p>
        </div>
      </header>

      <section className="category-transactions-summary">
        <div className="summary-card">
          <span className="summary-label">Total Expenses</span>
          <strong className="summary-value">{formatCurrency(totals.expenses)}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Income</span>
          <strong className="summary-value">{formatCurrency(totals.income)}</strong>
        </div>
        {totals.income > 0 || totals.expenses > 0 ? (
          <div className="summary-card">
            <span className="summary-label">Net</span>
            <strong
              className={`summary-value ${totals.net >= 0 ? "summary-value--positive" : "summary-value--negative"}`}
            >
              {formatCurrency(totals.net)}
            </strong>
          </div>
        ) : null}
      </section>

      {transactions.length === 0 ? (
        <p className="category-transactions-empty">No transactions in this category for {month}.</p>
      ) : (
        <section className="category-transactions-list">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor / Source</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn, idx) => {
                const key = `${txn.date}-${txn.vendor}-${txn.amount}-${txn.type}-${idx}`;
                return (
                  <tr key={key} className={`transaction-row transaction-row--${txn.type}`}>
                    <td className="transaction-date">{txn.date}</td>
                    <td className="transaction-vendor">{txn.vendor}</td>
                    <td className={`transaction-amount transaction-amount--${txn.type}`}>
                      {txn.type === "income" ? "+" : "−"}
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="transaction-notes">{txn.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
