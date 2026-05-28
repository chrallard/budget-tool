import { afterEach, describe, expect, it, vi } from "vitest";
import { AppsScriptApiClient } from "../../api/client";
import { AppsScriptDashboardDataSource } from "../../features/dashboard/dashboardDataSource";
import { AppsScriptImportDataSource } from "../../features/import/importDataSource";

describe("integration smoke", () => {
  const adapterBaseUrl = "http://localhost:5173/api/apps-script";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes GET config through the approved same-origin adapter path", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            expenseCategories: ["Food"],
            incomeCategories: ["Salary"],
            budgetTargets: [],
          },
        }),
      } as Response);

    const client = new AppsScriptApiClient(adapterBaseUrl);
    const data = await client.getConfig();

    expect(data.expenseCategories).toEqual(["Food"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const calledUrl = fetchMock.mock.calls[0]?.[0];
    expect(typeof calledUrl).toBe("string");
    if (typeof calledUrl !== "string") {
      throw new TypeError("Expected config request URL to be a string.");
    }

    expect(calledUrl).toContain("http://localhost:5173/api/apps-script");
    expect(calledUrl).toContain("action=config");
  });

  it("routes POST importBatch through the approved same-origin adapter path", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            written: { expenses: 1, income: 0 },
            skipped: 0,
            ignored: 0,
            failures: [],
          },
        }),
      } as Response);

    const client = new AppsScriptApiClient(adapterBaseUrl);
    const result = await client.postImportBatch({
      approvedTransactions: [
        {
          id: "tx-1",
          direction: "expense",
          displayDate: "05-24-2026",
          selectedCategory: "Food",
          editableAmount: 12.34,
          sourceAccount: "chequing",
          originalDate: "2026-05-24",
          originalAmount: -12.34,
          originalDescription: "LOBLAWS",
          normalizedDescription: "LOBLAWS",
          importFingerprint: "fp-1",
        },
      ],
    });

    expect(result.written.expenses).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const options = fetchMock.mock.calls[0]?.[1];
    expect(typeof options?.body).toBe("string");
    if (typeof options?.body !== "string") {
      throw new TypeError("Expected POST body to be a JSON string.");
    }

    const calledUrl = fetchMock.mock.calls[0]?.[0];
    expect(calledUrl).toBe(adapterBaseUrl);

    const parsedBody = JSON.parse(options.body);
    expect(parsedBody.action).toBe("importBatch");
    expect(parsedBody.approvedTransactions).toHaveLength(1);
  });

  it("wires dashboard data source with config and dashboard actions", async () => {
    const client = {
      getConfig: vi.fn(async () => ({
        expenseCategories: ["Food", "Gas"],
        incomeCategories: ["Salary"],
        budgetTargets: [{ category: "Food", amount: 500 }],
      })),
      getDashboard: vi.fn(async () => ({
        month: "2026-05",
        expenseRows: [
          {
            date: "05-22-2026",
            vendor: "LOBLAWS",
            amount: 80,
            category: "Food",
          },
        ],
        incomeRows: [
          {
            date: "05-23-2026",
            source: "Employer",
            amount: 3200,
            category: "Salary",
          },
        ],
        budgetTargets: [],
        expenseCategories: ["Unexpected"],
      })),
    };

    const dataSource = new AppsScriptDashboardDataSource(client as unknown as AppsScriptApiClient);
    const result = await dataSource.getDashboardData("2026-05");

    expect(result.expenseCategories).toEqual(["Food", "Gas"]);
    expect(result.budgetTargets[0]).toEqual({ category: "Food", monthlyTarget: 500, month: undefined });
    expect(result.expenses).toHaveLength(1);
    expect(result.income).toHaveLength(1);
  });

  it("returns clear dashboard error when config fails", async () => {
    const client = {
      getConfig: vi.fn(async () => {
        throw new Error("SHEET_READ_ERROR");
      }),
      getDashboard: vi.fn(),
    };

    const dataSource = new AppsScriptDashboardDataSource(client as unknown as AppsScriptApiClient);

    await expect(dataSource.getDashboardData("2026-05")).rejects.toThrow(
      "Unable to load categories and budget targets from config: SHEET_READ_ERROR",
    );
  });

  it("returns clear import error when duplicate metadata fails", async () => {
    const client = {
      getConfig: vi.fn(async () => ({
        expenseCategories: ["Food"],
        incomeCategories: ["Salary"],
        budgetTargets: [],
      })),
      getImportFingerprints: vi.fn(async () => {
        throw new Error("SHEET_READ_ERROR");
      }),
    };

    const dataSource = new AppsScriptImportDataSource(client as unknown as AppsScriptApiClient);

    await expect(dataSource.getImportReviewContext()).rejects.toThrow(
      "Unable to load duplicate metadata records: SHEET_READ_ERROR",
    );
  });
});
