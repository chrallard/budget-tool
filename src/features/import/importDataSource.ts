import {
  AppsScriptApiClient,
  type GetConfigResponse,
  type GetImportFingerprintsResponse,
  type PostImportBatchRequest,
  type PostImportBatchResponse,
} from "../../api/client";

export type ImportReviewContext = {
  expenseCategories: string[];
  incomeCategories: string[];
  existingRecords: GetImportFingerprintsResponse["records"];
};

export interface ImportDataSource {
  getImportReviewContext(): Promise<ImportReviewContext>;
  submitImportBatch(request: PostImportBatchRequest): Promise<PostImportBatchResponse>;
}

export class AppsScriptImportDataSource implements ImportDataSource {
  constructor(private readonly client: AppsScriptApiClient) { }

  async getImportReviewContext(): Promise<ImportReviewContext> {
    let config: GetConfigResponse;
    try {
      config = await this.client.getConfig();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Unable to load categories and targets from config: ${message}`);
    }

    if (!config.expenseCategories?.length) {
      throw new Error("Config did not return expense categories.");
    }

    if (!config.incomeCategories?.length) {
      throw new Error("Config did not return income categories.");
    }

    let fingerprints: GetImportFingerprintsResponse;
    try {
      fingerprints = await this.client.getImportFingerprints();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Unable to load duplicate metadata records: ${message}`);
    }

    return {
      expenseCategories: config.expenseCategories,
      incomeCategories: config.incomeCategories,
      existingRecords: fingerprints.records,
    };
  }

  async submitImportBatch(request: PostImportBatchRequest): Promise<PostImportBatchResponse> {
    return this.client.postImportBatch(request);
  }
}

export class MockImportDataSource implements ImportDataSource {
  async getImportReviewContext(): Promise<ImportReviewContext> {
    return {
      expenseCategories: [
        "Food",
        "Food out",
        "Coffee out",
        "Gas",
        "Rent",
        "Other",
      ],
      incomeCategories: ["Salary", "Other"],
      existingRecords: [],
    };
  }

  async submitImportBatch(request: PostImportBatchRequest): Promise<PostImportBatchResponse> {
    return {
      written: {
        expenses: request.approvedTransactions.filter((tx) => tx.direction === "expense").length,
        income: request.approvedTransactions.filter((tx) => tx.direction === "income").length,
      },
      skipped: 0,
      ignored: 0,
      failures: [],
    };
  }
}

export function createImportDataSource(): ImportDataSource {
  if (import.meta.env.VITE_USE_MOCK_IMPORT !== "false") {
    return new MockImportDataSource();
  }

  const url = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (!url) {
    throw new Error("VITE_APPS_SCRIPT_URL is required when VITE_USE_MOCK_IMPORT=false");
  }

  return new AppsScriptImportDataSource(new AppsScriptApiClient(url));
}