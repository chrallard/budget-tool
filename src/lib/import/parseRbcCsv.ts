import type { ParseRbcCsvOptions, ParseRbcCsvResult, RbcRawTransactionRow } from "./types";
import { detectRbcCsvType } from "./detectRbcCsvType";
import { normalizeRbcRowToTransaction } from "./normalizeTransaction";
import { ImportParserError } from "./types";

type CsvCursor = {
  rows: string[][];
  currentRow: string[];
  currentCell: string;
  inQuotes: boolean;
};

function pushCurrentCell(cursor: CsvCursor): void {
  cursor.currentRow.push(cursor.currentCell);
  cursor.currentCell = "";
}

function commitRowIfNotEmpty(cursor: CsvCursor): void {
  if (cursor.currentRow.some((value) => value.trim().length > 0)) {
    cursor.rows.push(cursor.currentRow);
  }
  cursor.currentRow = [];
}

function handleQuoteCharacter(
  cursor: CsvCursor,
  text: string,
  index: number,
): boolean {
  const next = text[index + 1];
  if (cursor.inQuotes && next === '"') {
    cursor.currentCell += '"';
    return true;
  }

  cursor.inQuotes = !cursor.inQuotes;
  return false;
}

function handleRowBoundary(
  cursor: CsvCursor,
  text: string,
  index: number,
): boolean {
  pushCurrentCell(cursor);
  commitRowIfNotEmpty(cursor);

  if (text[index] === "\r" && text[index + 1] === "\n") {
    return true;
  }

  return false;
}

function processCsvCharacter(
  cursor: CsvCursor,
  text: string,
  index: number,
): number {
  const char = text[index];

  if (char === '"') {
    return handleQuoteCharacter(cursor, text, index) ? 1 : 0;
  }

  if (char === "," && !cursor.inQuotes) {
    pushCurrentCell(cursor);
    return 0;
  }

  if ((char === "\n" || char === "\r") && !cursor.inQuotes) {
    return handleRowBoundary(cursor, text, index) ? 1 : 0;
  }

  cursor.currentCell += char;
  return 0;
}

function parseCsv(text: string): string[][] {
  const cursor: CsvCursor = {
    rows: [],
    currentRow: [],
    currentCell: "",
    inQuotes: false,
  };

  for (let i = 0; i < text.length; i += 1) {
    i += processCsvCharacter(cursor, text, i);
  }

  if (cursor.inQuotes) {
    throw new ImportParserError("INVALID_CSV", "CSV has unclosed quotes.");
  }

  pushCurrentCell(cursor);
  commitRowIfNotEmpty(cursor);

  return cursor.rows;
}

function toRawRow(row: string[], headerIndexByName: Record<string, number>, rowNumber: number): RbcRawTransactionRow {
  return {
    accountType: row[headerIndexByName["Account Type"]] ?? "",
    accountNumber: row[headerIndexByName["Account Number"]] ?? "",
    transactionDate: row[headerIndexByName["Transaction Date"]] ?? "",
    chequeNumber: row[headerIndexByName["Cheque Number"]] ?? "",
    description1: row[headerIndexByName["Description 1"]] ?? "",
    description2: row[headerIndexByName["Description 2"]] ?? "",
    cadAmount: row[headerIndexByName["CAD$"]] ?? "",
    usdAmount: row[headerIndexByName["USD$"]] ?? "",
    rowNumber,
  };
}

function hasTransactionData(row: RbcRawTransactionRow): boolean {
  return (
    row.transactionDate.trim().length > 0 ||
    row.description1.trim().length > 0 ||
    row.description2.trim().length > 0 ||
    row.cadAmount.trim().length > 0 ||
    row.usdAmount.trim().length > 0
  );
}

export function parseRbcCsv(
  csvText: string,
  options: ParseRbcCsvOptions,
): ParseRbcCsvResult {
  if (csvText.trim().length === 0) {
    throw new ImportParserError("EMPTY_CSV", "CSV file is empty.");
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new ImportParserError("EMPTY_CSV", "CSV file is empty.");
  }

  const detection = detectRbcCsvType(rows);

  const rawRows = rows
    .slice(1)
    .map((row, index) => toRawRow(row, detection.headerIndexByName, index + 2))
    .filter(hasTransactionData);

  if (rawRows.length === 0) {
    throw new ImportParserError(
      "NO_VALID_TRANSACTION_ROWS",
      "CSV has no valid transaction rows.",
    );
  }

  const transactions = rawRows.map((row, index) =>
    normalizeRbcRowToTransaction({
      sourceAccount: detection.sourceAccount,
      row,
      rowIndex: index,
      expenseCategories: options.expenseCategories,
      incomeCategories: options.incomeCategories,
      existingRecords: options.existingRecords,
    }),
  );

  return {
    sourceAccount: detection.sourceAccount,
    transactions,
  };
}
