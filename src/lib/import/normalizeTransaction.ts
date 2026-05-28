import type { NormalizedTransaction, SourceAccount } from "../../shared/types/transactions";
import { detectDuplicates } from "./detectDuplicates";
import { fingerprintTransaction } from "./fingerprintTransaction";
import { formatIsoToMmDdYyyy, parseRbcDateToIso } from "./formatDates";
import { buildOriginalDescription, normalizeDescription } from "./normalizeDescription";
import { suggestCategory } from "./suggestCategory";
import { suggestIgnoreReason } from "./suggestIgnoreReason";
import { ImportParserError, RbcRawTransactionRow } from "./types";

const REFUND_PATTERNS = ["REFUND", "REVERSAL", "RETURN", "CHARGEBACK"];

type NormalizeTransactionOptions = {
  sourceAccount: SourceAccount;
  row: RbcRawTransactionRow;
  rowIndex: number;
  expenseCategories: string[];
  incomeCategories: string[];
  existingRecords?: {
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
  }[];
};

function parseAmount(cadAmount: string, usdAmount: string): number {
  const cad = cadAmount.trim();
  const usd = usdAmount.trim();
  const rawAmount = cad.length > 0 ? cad : usd;

  if (rawAmount.length === 0) {
    throw new ImportParserError("INVALID_AMOUNT", "Transaction amount is missing.");
  }

  const normalized = rawAmount.split(",").join("");
  const amount = Number.parseFloat(normalized);

  if (!Number.isFinite(amount)) {
    throw new ImportParserError("INVALID_AMOUNT", "Transaction amount is invalid.", {
      amount: rawAmount,
    });
  }

  if (amount === 0) {
    throw new ImportParserError("INVALID_AMOUNT", "Transaction amount cannot be zero.", {
      amount: rawAmount,
    });
  }

  return amount;
}

function isRefund(description: string): boolean {
  const upper = description.toUpperCase();
  return REFUND_PATTERNS.some((pattern) => upper.includes(pattern));
}

function classifyDirectionAndEditableAmount(
  originalAmount: number,
  originalDescription: string,
): {
  direction: "income" | "expense";
  editableAmount: number;
} {
  if (isRefund(originalDescription)) {
    return {
      direction: "expense",
      editableAmount: -Math.abs(originalAmount),
    };
  }

  if (originalAmount < 0) {
    return {
      direction: "expense",
      editableAmount: Math.abs(originalAmount),
    };
  }

  return {
    direction: "income",
    editableAmount: originalAmount,
  };
}

function createStableId(
  sourceAccount: SourceAccount,
  originalDate: string,
  originalAmount: number,
  normalizedDescriptionValue: string,
  rowIndex: number,
): string {
  const amount = Math.abs(originalAmount).toFixed(2).split(".").join("");
  const desc = normalizedDescriptionValue.slice(0, 24) || "TX";
  return `${sourceAccount}-${originalDate}-${amount}-${desc}-${rowIndex}`;
}

export function normalizeRbcRowToTransaction({
  sourceAccount,
  row,
  rowIndex,
  expenseCategories,
  incomeCategories,
  existingRecords = [],
}: NormalizeTransactionOptions): NormalizedTransaction {
  const originalDate = parseRbcDateToIso(row.transactionDate);
  const displayDate = formatIsoToMmDdYyyy(originalDate);
  const originalDescription = buildOriginalDescription(row.description1, row.description2);
  const normalizedDescriptionValue = normalizeDescription(originalDescription);
  const originalAmount = parseAmount(row.cadAmount, row.usdAmount);
  const classification = classifyDirectionAndEditableAmount(
    originalAmount,
    originalDescription,
  );

  const suggestedCategory = suggestCategory({
    sourceAccount,
    direction: classification.direction,
    originalDescription,
    expenseCategories,
    incomeCategories,
  });

  const importFingerprint = fingerprintTransaction({
    sourceAccount,
    originalDate,
    originalAmount,
    normalizedDescription: normalizedDescriptionValue,
  });

  const duplicateResult = detectDuplicates(
    {
      importFingerprint,
      originalDate,
      originalAmount,
      editableAmount: classification.editableAmount,
      originalDescription,
    },
    existingRecords,
  );

  return {
    id: createStableId(
      sourceAccount,
      originalDate,
      originalAmount,
      normalizedDescriptionValue,
      rowIndex,
    ),
    sourceAccount,
    originalDate,
    displayDate,
    originalDescription,
    normalizedDescription: normalizedDescriptionValue,
    originalAmount,
    editableAmount: classification.editableAmount,
    direction: classification.direction,
    suggestedCategory,
    selectedCategory: suggestedCategory,
    status: "pending",
    ignoreReason: suggestIgnoreReason(sourceAccount, originalDescription),
    duplicateStatus: duplicateResult.duplicateStatus,
    duplicateMatches: duplicateResult.duplicateMatches,
    importFingerprint,
  };
}
