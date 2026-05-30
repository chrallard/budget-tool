import { useState } from "react";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { CategoryTransactionsPage } from "./features/dashboard/CategoryTransactionsPage";
import { ImportPage } from "./features/import/ImportPage";

export function App() {
  const [activeView, setActiveView] = useState<"dashboard" | "import" | "category-transactions">(
    "dashboard",
  );
  const [dashboardRefreshToken, setDashboardRefreshToken] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categoryTransactionMonth, setCategoryTransactionMonth] = useState<string>("");

  const handleCategorySelected = (category: string, month: string) => {
    setSelectedCategory(category);
    setCategoryTransactionMonth(month);
    setActiveView("category-transactions");
  };

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

      {activeView === "dashboard" ? (
        <DashboardPage
          key={dashboardRefreshToken}
          onCategorySelected={handleCategorySelected}
        />
      ) : null}
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
        />
      ) : null}
    </div>
  );
}
