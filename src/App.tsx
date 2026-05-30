import { useCallback, useState } from "react";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { CategoryTransactionsPage } from "./features/dashboard/CategoryTransactionsPage";
import { ImportPage } from "./features/import/ImportPage";
import type { DashboardData } from "./features/dashboard/types";

export function App() {
  const [activeView, setActiveView] = useState<"dashboard" | "import" | "category-transactions">(
    "dashboard",
  );
  const [dashboardRefreshToken, setDashboardRefreshToken] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categoryTransactionMonth, setCategoryTransactionMonth] = useState<string>("");
  const [dashboardDataByMonth, setDashboardDataByMonth] = useState<Record<string, DashboardData>>({});

  const handleCategorySelected = (category: string, month: string) => {
    setSelectedCategory(category);
    setCategoryTransactionMonth(month);
    setActiveView("category-transactions");
  };

  const handleDashboardDataLoaded = useCallback((month: string, data: DashboardData) => {
    setDashboardDataByMonth((previous) => ({
      ...previous,
      [month]: data,
    }));
  }, []);

  const handleBackToDashboard = () => {
    setActiveView("dashboard");
  };

  return (
    <div className="app-shell">
      <header className="app-nav">
        <div>
          <p className="dashboard-eyebrow">Budgeting MVP</p>
          <h1>Budget workspace</h1>
        </div>
        <div className="app-nav__buttons" role="tablist" aria-label="Primary views">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "dashboard"}
            className={activeView === "dashboard" ? "nav-button nav-button--active" : "nav-button"}
            onClick={() => setActiveView("dashboard")}
          >
            Dashboard
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "import"}
            className={activeView === "import" ? "nav-button nav-button--active" : "nav-button"}
            onClick={() => setActiveView("import")}
          >
            Import review
          </button>
        </div>
      </header>

      <div style={{ display: activeView === "dashboard" ? "block" : "none" }}>
        <DashboardPage
          key={dashboardRefreshToken}
          onCategorySelected={handleCategorySelected}
          onDataLoaded={handleDashboardDataLoaded}
        />
      </div>
      {activeView === "import" ? (
        <ImportPage
          onImportSuccess={() => {
            setDashboardRefreshToken((value) => value + 1);
            setActiveView("dashboard");
          }}
        />
      ) : null}
      {activeView === "category-transactions" ? (
        <CategoryTransactionsPage
          category={selectedCategory}
          month={categoryTransactionMonth}
          onBack={handleBackToDashboard}
          initialDashboardData={dashboardDataByMonth[categoryTransactionMonth] ?? null}
        />
      ) : null}
    </div>
  );
}
