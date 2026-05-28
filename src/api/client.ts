import { apiActions } from "./actions";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: {
    requestId?: string;
    generatedAt: string;
  };
};

export type ApiError = {
  ok: false;
  error: {
    code:
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "SHEET_READ_ERROR"
    | "SHEET_WRITE_ERROR"
    | "INTERNAL_ERROR";
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    generatedAt: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type ApiBudgetTarget = {
  category: string;
  amount?: number;
  monthlyTarget?: number | null;
  month?: string;
};

export type GetConfigResponse = {
  expenseCategories: string[];
  incomeCategories: string[];
  budgetTargets: ApiBudgetTarget[];
};

export type GetImportFingerprintsResponse = {
  records: ImportFingerprintRecord[];
};

export type ImportBatchTransaction = {
  id: string;
  direction: "income" | "expense";
  displayDate: string;
  selectedCategory: string;
  editableAmount: number;
  notes?: string;
  sourceAccount: "chequing" | "credit_card";
  originalDate: string;
  originalAmount: number;
  originalDescription: string;
  normalizedDescription: string;
  importFingerprint: string;
};

export type PostImportBatchRequest = {
  action?: "importBatch";
  month?: string;
  approvedTransactions: ImportBatchTransaction[];
};

export type PostImportBatchResponse = {
  written: {
    expenses: number;
    income: number;
  };
  skipped: number;
  ignored: number;
  failures: Array<{
    id: string;
    reason: string;
  }>;
};

export type DashboardExpenseRow = {
  date: string;
  vendor?: string;
  source?: string;
  amount: number;
  category: string;
  notes?: string;
};

export type DashboardIncomeRow = {
  date: string;
  source?: string;
  vendor?: string;
  amount: number;
  category: string;
  notes?: string;
};

export type GetDashboardResponse = {
  month: string;
  expenseRows?: DashboardExpenseRow[];
  incomeRows?: DashboardIncomeRow[];
  expenses?: DashboardExpenseRow[];
  income?: DashboardIncomeRow[];
  budgetTargets: ApiBudgetTarget[];
  expenseCategories: string[];
};

export type ImportFingerprintRecord = {
  sheetName: "Expenses" | "Income";
  rowNumber?: number;
  date: string;
  vendorOrSource: string;
  amount: number;
  category: string;
  importFingerprint: string;
  sourceAccount?: "chequing" | "credit_card";
  originalDate?: string;
  originalAmount?: number;
  originalDescription?: string;
};

export class AppsScriptApiClient {
  constructor(private readonly baseUrl: string) { }

  private toNetworkError(action: string, error: unknown): Error {
    if (error instanceof TypeError) {
      return new Error(
        `Network request failed while calling ${action}. If browser console shows CORS with a 302 redirect, this is a known Apps Script web-app cross-origin/auth redirect limitation for localhost calls.`,
      );
    }

    return error instanceof Error ? error : new Error(`Request failed while calling ${action}.`);
  }

  async getConfig(): Promise<GetConfigResponse> {
    return this.get<GetConfigResponse>(apiActions.config);
  }

  async getDashboard(month: string): Promise<GetDashboardResponse> {
    return this.get<GetDashboardResponse>(apiActions.dashboard, { month });
  }

  async getImportFingerprints(): Promise<GetImportFingerprintsResponse> {
    return this.get<GetImportFingerprintsResponse>(apiActions.importFingerprints);
  }

  async postImportBatch(request: PostImportBatchRequest): Promise<PostImportBatchResponse> {
    return this.post<PostImportBatchResponse>({
      action: apiActions.importBatch,
      ...request,
    });
  }

  private async get<T>(action: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(this.baseUrl);
    url.searchParams.set("action", action);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
      });
    } catch (error) {
      throw this.toNetworkError(action, error);
    }

    return this.parseResponse<T>(response, action);
  }

  private async post<T>(body: Record<string, unknown>): Promise<T> {
    const action = typeof body.action === "string" ? body.action : "unknown";
    let response: Response;
    try {
      response = await fetch(this.baseUrl, {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw this.toNetworkError(action, error);
    }

    return this.parseResponse<T>(response, action);
  }

  private async parseResponse<T>(response: Response, action: string): Promise<T> {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while calling ${action}`);
    }

    const payload = (await response.json()) as ApiResponse<T>;
    if (!payload.ok) {
      throw new Error(payload.error.message || `API ${action} failed`);
    }

    return payload.data;
  }
}
