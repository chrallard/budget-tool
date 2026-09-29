import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, AppsScriptApiClient } from "../client";

describe("AppsScriptApiClient access key", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the access key on GET and POST", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          expenseCategories: ["Food"],
          incomeCategories: ["Salary"],
          budgetTargets: [],
          written: { expenses: 0, income: 0 },
          skipped: 0,
          ignored: 0,
          failures: [],
        },
      }),
    } as Response);

    const client = new AppsScriptApiClient("https://example.com/exec", "secret-key");
    await client.getConfig();
    await client.postImportBatch({ approvedTransactions: [] });

    const getUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(getUrl).toContain("action=config");
    expect(getUrl).toContain("key=secret-key");

    const postBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(postBody.key).toBe("secret-key");
    expect(postBody.action).toBe("importBatch");
  });

  it("throws ApiRequestError when the key is rejected", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized." },
      }),
    } as Response);

    const client = new AppsScriptApiClient("https://example.com/exec", "nope");
    await expect(client.getConfig()).rejects.toBeInstanceOf(ApiRequestError);
    await expect(client.getConfig()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
