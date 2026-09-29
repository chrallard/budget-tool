import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../App";
import { clearAccessKey, getAccessKey } from "../accessKey";

afterEach(() => {
  cleanup();
  clearAccessKey();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("AccessGate", () => {
  it("asks for an access key before loading live data", () => {
    vi.stubEnv("VITE_USE_MOCK_DASHBOARD", "false");
    vi.stubEnv("VITE_USE_MOCK_IMPORT", "false");

    render(<App />);

    expect(screen.getByLabelText("Access key")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("unlocks after the server accepts the key", async () => {
    vi.stubEnv("VITE_USE_MOCK_DASHBOARD", "false");
    vi.stubEnv("VITE_USE_MOCK_IMPORT", "false");
    vi.stubEnv("VITE_APPS_SCRIPT_URL", "https://example.com/exec");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          expenseCategories: ["Food"],
          incomeCategories: ["Salary"],
          budgetTargets: [],
          month: "2026-09",
          expenseRows: [],
          incomeRows: [],
        },
      }),
    } as Response);

    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Access key"), "secret-key");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByRole("tab", { name: "Dashboard" })).toBeInTheDocument();
    expect(getAccessKey()).toBe("secret-key");
  });

  it("stays locked when the key is rejected", async () => {
    vi.stubEnv("VITE_USE_MOCK_DASHBOARD", "false");
    vi.stubEnv("VITE_USE_MOCK_IMPORT", "false");
    vi.stubEnv("VITE_APPS_SCRIPT_URL", "https://example.com/exec");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized." },
      }),
    } as Response);

    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Access key"), "wrong");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That access key was rejected.");
    expect(screen.queryByRole("tab", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(getAccessKey()).toBe("");
  });
});
