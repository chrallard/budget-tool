import type { CsvDetectResult } from "./types";
import { ImportParserError } from "./types";

function normalizeCell(value: string): string {
  return value.trim().toLowerCase();
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function isNumericOrBlank(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return true;
  }

  const normalized = trimmed
    .replace(/^[($\s]+/, "")
    .replace(/[)$,\s]+$/g, "")
    .replace(/^\+/, "");

  if (normalized.length === 0) {
    return false;
  }

  return Number.isFinite(Number.parseFloat(normalized));
}

function isHeaderlessTdChequingRow(row: string[]): boolean {
  if (row.length < 4) {
    return false;
  }

  const dateCell = row[0] ?? "";
  const descriptionCell = row[1] ?? "";
  const chargeCell = row[2] ?? "";
  const incomeCell = row[3] ?? "";

  if (!isIsoDate(dateCell) || descriptionCell.trim().length === 0) {
    return false;
  }

  return isNumericOrBlank(chargeCell) && isNumericOrBlank(incomeCell);
}

function findHeaderIndex(headerRow: string[], candidates: string[], label: string): number {
  const normalizedCandidates = new Set(candidates.map((candidate) => normalizeCell(candidate)));
  const index = headerRow.findIndex((value) => normalizedCandidates.has(normalizeCell(value)));

  if (index < 0) {
    throw new ImportParserError(
      "MISSING_REQUIRED_COLUMNS",
      `CSV is missing required TD column: ${label}.`,
      { missingColumn: label },
    );
  }

  return index;
}

function findOptionalHeaderIndex(headerRow: string[], candidates: string[]): number {
  const normalizedCandidates = new Set(candidates.map((candidate) => normalizeCell(candidate)));
  return headerRow.findIndex((value) => normalizedCandidates.has(normalizeCell(value)));
}

export function detectTdCsvType(csvRows: string[][]): CsvDetectResult {
  if (csvRows.length === 0) {
    throw new ImportParserError("EMPTY_CSV", "CSV file is empty.");
  }

  const firstRow = csvRows[0]?.map((cell) => cell.trim()) ?? [];
  if (isHeaderlessTdChequingRow(firstRow)) {
    return {
      format: "td",
      sourceAccount: "chequing",
      headerIndexByName: {
        transactionDate: 0,
        description: 1,
        amount: -1,
        debitAmount: 2,
        creditAmount: 3,
      },
      dataStartRow: 0,
    };
  }

  const headerRow = csvRows[0]?.map((cell) => cell.trim()) ?? [];
  if (headerRow.every((cell) => cell.length === 0)) {
    throw new ImportParserError("INVALID_CSV", "CSV header row is invalid.");
  }

  const transactionDateIndex = findHeaderIndex(
    headerRow,
    ["Transaction Date", "Date", "Posting Date", "Processed Date"],
    "Transaction Date",
  );

  const descriptionIndex = findHeaderIndex(
    headerRow,
    ["Description", "Transaction Description", "Details", "Merchant", "Payee", "Transaction"],
    "Description",
  );

  const amountIndex = findOptionalHeaderIndex(
    headerRow,
    ["Amount", "Transaction Amount", "Value", "CAD$", "CAD"],
  );
  const debitIndex = findOptionalHeaderIndex(
    headerRow,
    ["Debit", "Withdrawal", "Withdrawals", "Withdrawals and Other Debits", "Debit Amount"],
  );
  const creditIndex = findOptionalHeaderIndex(
    headerRow,
    ["Credit", "Deposit", "Deposits", "Deposits and Other Credits", "Credit Amount"],
  );

  if (amountIndex < 0 && debitIndex < 0 && creditIndex < 0) {
    throw new ImportParserError(
      "MISSING_REQUIRED_COLUMNS",
      "CSV is missing TD amount columns.",
      { missingColumn: "Amount" },
    );
  }

  return {
    format: "td",
    sourceAccount: "chequing",
    headerIndexByName: {
      transactionDate: transactionDateIndex,
      description: descriptionIndex,
      amount: amountIndex,
      debitAmount: debitIndex,
      creditAmount: creditIndex,
    },
    dataStartRow: 1,
  };
}