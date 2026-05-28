export type SourceAccount = "chequing" | "credit_card";

export type TransactionDirection = "income" | "expense";

export type TransactionStatus = "pending" | "approved" | "skipped" | "ignored";

export type IgnoreReason =
  | "internal_transfer"
  | "credit_card_payment"
  | "duplicate"
  | "other";

export type DuplicateStatus =
  | "not_duplicate"
  | "possible_duplicate"
  | "confirmed_duplicate";

export type DuplicateMatch = {
  sheetName: "Expenses" | "Income";
  rowNumber?: number;
  date: string;
  vendorOrSource: string;
  amount: number;
  category: string;
  importFingerprint?: string;
  matchReason: string;
};

export type NormalizedTransaction = {
  id: string;
  sourceAccount: SourceAccount;
  originalDate: string;
  displayDate: string;
  originalDescription: string;
  normalizedDescription: string;
  displayNameOverride?: string;
  originalAmount: number;
  editableAmount: number;
  direction: TransactionDirection;
  suggestedCategory?: string;
  selectedCategory?: string;
  notes?: string;
  status: TransactionStatus;
  ignoreReason?: IgnoreReason;
  duplicateStatus: DuplicateStatus;
  duplicateMatches?: DuplicateMatch[];
  importFingerprint: string;
};

export type BudgetTarget = {
  category: string;
  month?: string;
  amount: number;
};

export type AppConfig = {
  expenseCategories: string[];
  incomeCategories: string[];
  budgetTargets: BudgetTarget[];
};

export type ImportFingerprintRecord = {
  sheetName: "Expenses" | "Income";
  rowNumber?: number;
  date: string;
  vendorOrSource: string;
  amount: number;
  category: string;
  importFingerprint: string;
  sourceAccount?: SourceAccount;
  originalDate?: string;
  originalAmount?: number;
  originalDescription?: string;
};
