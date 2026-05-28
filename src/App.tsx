import { useState } from "react";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ImportPage } from "./features/import/ImportPage";

export function App() {
  const [activeView, setActiveView] = useState<"dashboard" | "import">("dashboard");
  const [dashboardRefreshToken, setDashboardRefreshToken] = useState(0);

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

      {activeView === "dashboard" ? <DashboardPage key={dashboardRefreshToken} /> : null}
      {activeView === "import" ? (
        <ImportPage
          onImportSuccess={() => {
            setDashboardRefreshToken((value) => value + 1);
            setActiveView("dashboard");
          }}
        />
      ) : null}
    </div>
  );
}
