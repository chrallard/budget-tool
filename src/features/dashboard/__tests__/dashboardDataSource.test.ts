import { describe, expect, it, vi } from "vitest";
import type { AppsScriptApiClient, GetDashboardResponse } from "../../../api/client";
import { AppsScriptDashboardDataSource } from "../dashboardDataSource";

function createClient(getDashboard: AppsScriptApiClient["getDashboard"]): AppsScriptApiClient {
  return {
    getConfig: vi.fn(async () => ({
      expenseCategories: ["Food"],
      incomeCategories: ["Salary"],
      budgetTargets: [],
    })),
    getDashboard,
  } as unknown as AppsScriptApiClient;
}

function dashboardResponse(month: string): GetDashboardResponse {
  return {
    month,
    expenseCategories: ["Food"],
    budgetTargets: [],
    expenses: [{ date: "05-01-2026", category: "Food", amount: 10 }],
    income: [],
  };
}

describe("AppsScriptDashboardDataSource", () => {
  it("returns a cached month without calling the dashboard endpoint again", async () => {
    const getDashboard = vi.fn(async (month: string) => dashboardResponse(month));
    const dataSource = new AppsScriptDashboardDataSource(createClient(getDashboard));

    const first = await dataSource.getDashboardData("2026-05");
    const second = await dataSource.getDashboardData("2026-05");

    expect(second).toEqual(first);
    expect(getDashboard).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight request for the same month", async () => {
    let resolveDashboard: (data: GetDashboardResponse) => void = () => {};
    const getDashboard = vi.fn(
      () =>
        new Promise<GetDashboardResponse>((resolve) => {
          resolveDashboard = resolve;
        }),
    );
    const dataSource = new AppsScriptDashboardDataSource(createClient(getDashboard));

    const first = dataSource.getDashboardData("2026-05");
    const second = dataSource.getDashboardData("2026-05");
    await vi.waitFor(() => {
      expect(getDashboard).toHaveBeenCalledTimes(1);
    });
    resolveDashboard(dashboardResponse("2026-05"));

    const [left, right] = await Promise.all([first, second]);
    expect(left).toEqual(right);
    expect(getDashboard).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed month", async () => {
    const getDashboard = vi
      .fn()
      .mockRejectedValueOnce(new Error("Sheet read failed"))
      .mockResolvedValueOnce(dashboardResponse("2026-05"));
    const dataSource = new AppsScriptDashboardDataSource(createClient(getDashboard));

    await expect(dataSource.getDashboardData("2026-05")).rejects.toThrow("Sheet read failed");
    await expect(dataSource.getDashboardData("2026-05")).resolves.toMatchObject({ month: "2026-05" });
    expect(getDashboard).toHaveBeenCalledTimes(2);
  });
});
