import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PostImportBatchRequest, PostImportBatchResponse } from "../../../api/client";
import { ImportPage } from "../ImportPage";
import type { ImportDataSource } from "../importDataSource";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fixture(name: string): string {
  return readFileSync(resolve(__dirname, "../parser/__tests__/fixtures", name), "utf8");
}

function csvWithRows(rows: string[]): string {
  return [
    "Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$",
    ...rows,
  ].join("\n");
}

function createDataSource(overrides: Partial<ImportDataSource> = {}): ImportDataSource {
  return {
    async getImportReviewContext() {
      return {
        expenseCategories: ["Food", "Food out", "Coffee out", "Other"],
        incomeCategories: ["Salary", "Other"],
        existingRecords: [],
      };
    },
    async submitImportBatch(_request: PostImportBatchRequest): Promise<PostImportBatchResponse> {
      return {
        written: { expenses: 1, income: 0 },
        skipped: 0,
        ignored: 0,
        failures: [],
      };
    },
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("ImportPage", () => {
  it("uploads a valid chequing CSV and shows one pending transaction at a time", async () => {
    const user = userEvent.setup();
    render(<ImportPage dataSource={createDataSource()} />);

    const input = await screen.findByLabelText(/choose a chequing or visa export/i);
    await user.upload(input, new File([fixture("rbc-chequing-valid.csv")], "chequing.csv", { type: "text/csv" }));

    expect(await screen.findByText("Detected source account")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "E-TRANSFER FROM JOHN" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "LOBLAWS 123" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /PAYROLL/ })).not.toBeInTheDocument();
  });

  it("uploads a valid credit card CSV and detects the source account", async () => {
    const user = userEvent.setup();
    render(<ImportPage dataSource={createDataSource()} />);

    const input = await screen.findByLabelText(/choose a chequing or visa export/i);
    await user.upload(input, new File([fixture("rbc-visa-valid.csv")], "visa.csv", { type: "text/csv" }));

    expect(await screen.findByRole("heading", { name: "Credit card" })).toBeInTheDocument();
  });

  it("shows invalid CSV errors", async () => {
    const user = userEvent.setup();
    render(<ImportPage dataSource={createDataSource()} />);

    const input = await screen.findByLabelText(/choose a chequing or visa export/i);
    await user.upload(input, new File([fixture("rbc-invalid-headers.csv")], "invalid.csv", { type: "text/csv" }));

    expect(await screen.findByText("CSV is missing one or more required RBC columns.")).toBeInTheDocument();
  });

  it("shows empty CSV messages", async () => {
    const user = userEvent.setup();
    render(<ImportPage dataSource={createDataSource()} />);

    const input = await screen.findByLabelText(/choose a chequing or visa export/i);
    await user.upload(input, new File(["   "], "empty.csv", { type: "text/csv" }));

    expect(await screen.findByText("CSV file is empty.")).toBeInTheDocument();
  });

  it("blocks approval without a valid category and allows amount and notes edits", async () => {
    const user = userEvent.setup();
    render(
      <ImportPage
        dataSource={createDataSource({
          async getImportReviewContext() {
            return {
              expenseCategories: ["Food"],
              incomeCategories: ["Salary"],
              existingRecords: [],
            };
          },
        })}
      />,
    );

    const input = await screen.findByLabelText(/choose a chequing or visa export/i);
    const csv = csvWithRows([
      'CHEQUING,123,05/01/2026,,MYSTERY SHOP,,"-10.00",',
    ]);
    await user.upload(input, new File([csv], "manual.csv", { type: "text/csv" }));

    const approve = await screen.findByRole("button", { name: "Approve transaction" });
    expect(approve).toBeDisabled();

    const amount = screen.getByLabelText("Amount");
    await user.clear(amount);
    await user.type(amount, "18.5");
    expect((amount as HTMLInputElement).value).toBe("18.5");
    expect(screen.getByText("Original $10.00")).toBeInTheDocument();

    const notes = screen.getByLabelText("Notes");
    await user.type(notes, "needs review");
    expect((notes as HTMLTextAreaElement).value).toBe("needs review");

    await user.selectOptions(screen.getByLabelText("Category"), "Food");
    expect(approve).not.toBeDisabled();
  });

  it("can skip and ignore transactions", async () => {
    const user = userEvent.setup();
    render(<ImportPage dataSource={createDataSource()} />);

    const input = await screen.findByLabelText(/choose a chequing or visa export/i);
    const csv = csvWithRows([
      'CHEQUING,123,05/01/2026,,LOBLAWS 123,,"-10.00",',
      'CHEQUING,123,05/02/2026,,ACCOUNT TRANSFER SAVINGS,,"-25.00",',
    ]);
    await user.upload(input, new File([csv], "actions.csv", { type: "text/csv" }));

    await user.click(await screen.findByRole("button", { name: "Skip transaction" }));
    expect(await screen.findByRole("heading", { name: "ACCOUNT TRANSFER SAVINGS" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mark internal transfer" }));
    expect(await screen.findByText("Review complete")).toBeInTheDocument();
    expect(screen.getByText("ignored")).toBeInTheDocument();
  });

  it("shows duplicate warnings and can skip as duplicate", async () => {
    const user = userEvent.setup();
    render(
      <ImportPage
        dataSource={createDataSource({
          async getImportReviewContext() {
            return {
              expenseCategories: ["Food", "Other"],
              incomeCategories: ["Salary", "Other"],
              existingRecords: [
                {
                  sheetName: "Expenses",
                  date: "05-02-2026",
                  vendorOrSource: "LOBLAWS 123",
                  amount: 10,
                  category: "Food",
                  importFingerprint: "different-fingerprint",
                },
              ],
            };
          },
        })}
      />,
    );

    const input = await screen.findByLabelText(/choose a chequing or visa export/i);
    const csv = csvWithRows([
      'CHEQUING,123,05/01/2026,,LOBLAWS 123,,"-10.00",',
    ]);
    await user.upload(input, new File([csv], "duplicate.csv", { type: "text/csv" }));

    expect(await screen.findByRole("heading", { name: "Possible duplicate" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip as duplicate" }));
    expect(await screen.findByText("Review complete")).toBeInTheDocument();
  });

  it("can import a possible duplicate anyway and submit approved rows only", async () => {
    const user = userEvent.setup();
    const submitImportBatch = vi.fn(async (request: PostImportBatchRequest) => ({
      written: { expenses: request.approvedTransactions.length, income: 0 },
      skipped: 0,
      ignored: 0,
      failures: [],
    }));
    const onImportSuccess = vi.fn();

    render(
      <ImportPage
        onImportSuccess={onImportSuccess}
        dataSource={createDataSource({
          submitImportBatch,
          async getImportReviewContext() {
            return {
              expenseCategories: ["Food", "Other"],
              incomeCategories: ["Salary", "Other"],
              existingRecords: [
                {
                  sheetName: "Expenses",
                  date: "05-02-2026",
                  vendorOrSource: "LOBLAWS 123",
                  amount: 10,
                  category: "Food",
                  importFingerprint: "different-fingerprint",
                },
              ],
            };
          },
        })}
      />,
    );

    const input = await screen.findByLabelText(/choose a chequing or visa export/i);
    const csv = csvWithRows([
      'CHEQUING,123,05/01/2026,,LOBLAWS 123,,"-10.00",',
      'CHEQUING,123,05/03/2026,,ACCOUNT TRANSFER SAVINGS,,"-25.00",',
    ]);
    await user.upload(input, new File([csv], "submit.csv", { type: "text/csv" }));

    const storeVendorInput = await screen.findByLabelText("Store / Vendor");
    await user.clear(storeVendorInput);
    await user.type(storeVendorInput, "Loblaws Rideau");

    await user.click(await screen.findByRole("button", { name: "Import anyway" }));
    await user.click(await screen.findByRole("button", { name: "Mark internal transfer" }));
    await user.click(await screen.findByRole("button", { name: /submit 1 approved transaction/i }));

    await waitFor(() => expect(submitImportBatch).toHaveBeenCalledTimes(1));
    expect(submitImportBatch.mock.calls[0]?.[0].approvedTransactions).toHaveLength(1);
    expect(submitImportBatch.mock.calls[0]?.[0].approvedTransactions[0]?.displayNameOverride).toBe("Loblaws Rideau");
    expect(onImportSuccess).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Imported 1 transactions successfully.")).toBeInTheDocument();
  });

  it("preserves the review session when submission fails", async () => {
    const user = userEvent.setup();
    const submitImportBatch = vi.fn(async () => {
      throw new Error("Sheet write failed");
    });

    render(<ImportPage dataSource={createDataSource({ submitImportBatch })} />);

    const input = await screen.findByLabelText(/choose a chequing or visa export/i);
    const csv = csvWithRows([
      'CHEQUING,123,05/01/2026,,LOBLAWS 123,,"-10.00",',
    ]);
    await user.upload(input, new File([csv], "failure.csv", { type: "text/csv" }));

    await user.click(await screen.findByRole("button", { name: "Approve transaction" }));
    await user.click(await screen.findByRole("button", { name: /submit 1 approved transaction/i }));

    expect(await screen.findByText("Sheet write failed")).toBeInTheDocument();
    expect(screen.getByText("LOBLAWS 123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument();
  });
});