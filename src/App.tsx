import { useCallback, useState } from "react";
import { AccessGate } from "./auth/AccessGate";
import { requiresAccessKey } from "./auth/accessKey";
import { AllotmentsPage } from "./features/dashboard/AllotmentsPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { CategoryTransactionsPage } from "./features/dashboard/CategoryTransactionsPage";
import { ImportPage } from "./features/import/ImportPage";
import type { DashboardData } from "./features/dashboard/types";

export function App() {
  const accessRequired = requiresAccessKey();
  const [unlocked, setUnlocked] = useState(() => !accessRequired);
  const [activeView, setActiveView] = useState<"dashboard" | "allotments" | "import" | "category-transactions">(
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

  if (accessRequired && !unlocked) {
    return <AccessGate onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div className="app-shell">
      <header className="app-nav">
        <div>
          <p className="dashboard-eyebrow">budget-tool</p>
          <h1>Workspace</h1>
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
            aria-selected={activeView === "allotments"}
            className={activeView === "allotments" ? "nav-button nav-button--active" : "nav-button"}
            onClick={() => setActiveView("allotments")}
          >
            Allotments
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "import"}
            className={activeView === "import" ? "nav-button nav-button--active" : "nav-button"}
            onClick={() => setActiveView("import")}
          >
            Import
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
      {activeView === "allotments" ? <AllotmentsPage /> : null}
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
