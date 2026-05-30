import type {
  DuplicateMatch,
  ImportFingerprintRecord,
  NormalizedTransaction,
  SourceAccount,
} from "../../shared/types/transactions";

export const RBC_LOCKED_HEADERS = [
  "Account Type",
  "Account Number",
  "Transaction Date",
  "Cheque Number",
  "Description 1",
  "Description 2",
  "CAD$",
  "USD$",
] as const;

export type RbcLockedHeader = (typeof RBC_LOCKED_HEADERS)[number];

export type CsvImportFormat = "rbc" | "td";

export type CsvDetectResult = {
  format: CsvImportFormat;
  sourceAccount: SourceAccount;
  headerIndexByName: Record<string, number>;
  dataStartRow: number;
};

export type RbcRawTransactionRow = {
  accountType: string;
  accountNumber: string;
  transactionDate: string;
  chequeNumber: string;
  description1: string;
  description2: string;
  cadAmount: string;
  usdAmount: string;
  rowNumber: number;
};

export type TdRawTransactionRow = {
  transactionDate: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
  amount: string;
  rowNumber: number;
};

export type ParseRbcCsvOptions = {
  expenseCategories: string[];
  incomeCategories: string[];
  existingRecords?: ImportFingerprintRecord[];
};

export type ParseRbcCsvResult = {
  sourceAccount: SourceAccount;
  transactions: NormalizedTransaction[];
};

export type TransactionDuplicateResult = {
  duplicateStatus: NormalizedTransaction["duplicateStatus"];
  duplicateMatches?: DuplicateMatch[];
};

export type ImportParserErrorCode =
  | "EMPTY_CSV"
  | "INVALID_CSV"
  | "UNSUPPORTED_CSV_FORMAT"
  | "UNSUPPORTED_RBC_FORMAT"
  | "MISSING_REQUIRED_COLUMNS"
  | "NO_VALID_TRANSACTION_ROWS"
  | "INVALID_AMOUNT"
  | "INVALID_DATE";

export class ImportParserError extends Error {
  readonly code: ImportParserErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ImportParserErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ImportParserError";
    this.code = code;
    this.details = details;
  }
}
