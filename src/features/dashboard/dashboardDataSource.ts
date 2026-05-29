import {
  AppsScriptApiClient,
  type ApiBudgetTarget,
  type GetConfigResponse,
  type GetDashboardResponse,
} from "../../api/client";
import { collectAvailableMonths } from "./dashboardCalculations";
import { mockDashboardData } from "./mockDashboardData";
import type { BudgetTarget, DashboardData } from "./types";

export interface DashboardDataSource {
  getDashboardData(month: string): Promise<DashboardData>;
}

function toBudgetTargets(targets: ApiBudgetTarget[]): BudgetTarget[] {
  return targets.map((target) => {
    let targetAmount: number | undefined;
    if (target.monthlyTarget === null) {
      targetAmount = undefined;
    } else {
      targetAmount = target.monthlyTarget ?? target.amount;
    }

    return {
      category: target.category,
      monthlyTarget: targetAmount,
      month: target.month,
    };
  });
}

function normalizeDashboardData(config: GetConfigResponse, dashboard: GetDashboardResponse): DashboardData {
  const expenses = dashboard.expenseRows ?? dashboard.expenses ?? [];
  const income = dashboard.incomeRows ?? dashboard.income ?? [];

  return {
    month: dashboard.month,
    availableMonths:
      dashboard.availableMonths && dashboard.availableMonths.length > 0
        ? dashboard.availableMonths
        : collectAvailableMonths(expenses, income, dashboard.month),
    expenseCategories: config.expenseCategories,
    budgetTargets: toBudgetTargets(config.budgetTargets.length ? config.budgetTargets : dashboard.budgetTargets),
    expenses,
    income,
  };
}

export class AppsScriptDashboardDataSource implements DashboardDataSource {
  private cachedConfig: GetConfigResponse | null = null;
  private inFlightConfig: Promise<GetConfigResponse> | null = null;
  private readonly inFlightDashboardByMonth = new Map<string, Promise<DashboardData>>();

  constructor(private readonly client: AppsScriptApiClient) { }

  private async getConfigCached(): Promise<GetConfigResponse> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    if (this.inFlightConfig) {
      return this.inFlightConfig;
    }

    const configRequest = this.client
      .getConfig()
      .then((config) => {
        this.cachedConfig = config;
        return config;
      })
      .finally(() => {
        this.inFlightConfig = null;
      });

    this.inFlightConfig = configRequest;
    return configRequest;
  }

  private async loadDashboardData(month: string): Promise<DashboardData> {
    let config: GetConfigResponse;
    try {
      config = await this.getConfigCached();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Unable to load categories and budget targets from config: ${message}`);
    }

    if (!config.expenseCategories?.length) {
      throw new Error("Config did not return expense categories.");
    }

    if (!config.incomeCategories?.length) {
      throw new Error("Config did not return income categories.");
    }

    let dashboard: GetDashboardResponse;
    try {
      dashboard = await this.client.getDashboard(month);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Unable to load dashboard data for ${month}: ${message}`);
    }

    return normalizeDashboardData(config, dashboard);
  }

  async getDashboardData(month: string): Promise<DashboardData> {
    const existingRequest = this.inFlightDashboardByMonth.get(month);
    if (existingRequest) {
      return existingRequest;
    }

    const request = this.loadDashboardData(month).finally(() => {
      this.inFlightDashboardByMonth.delete(month);
    });

    this.inFlightDashboardByMonth.set(month, request);
    return request;
  }
}

export class MockDashboardDataSource implements DashboardDataSource {
  async getDashboardData(month: string): Promise<DashboardData> {
    return {
      ...mockDashboardData,
      month,
    };
  }
}

export function createDashboardDataSource(): DashboardDataSource {
  if (import.meta.env.VITE_USE_MOCK_DASHBOARD !== "false") {
    return new MockDashboardDataSource();
  }

  const url = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (!url) {
    throw new Error("VITE_APPS_SCRIPT_URL is required when VITE_USE_MOCK_DASHBOARD=false");
  }

  return new AppsScriptDashboardDataSource(new AppsScriptApiClient(url));
}
