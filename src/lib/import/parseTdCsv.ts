import { parseAnyDateToIso } from "./formatDates";
import { normalizeImportedRowToTransaction } from "./normalizeTransaction";
import { ImportParserError } from "./types";
import type { ParseRbcCsvOptions, ParseRbcCsvResult, TdRawTransactionRow } from "./types";
import { detectTdCsvType } from "./detectTdCsvType";

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

function handleQuoteCharacter(cursor: CsvCursor, text: string, index: number): boolean {
  const next = text[index + 1];
  if (cursor.inQuotes && next === '"') {
    cursor.currentCell += '"';
    return true;
  }

  cursor.inQuotes = !cursor.inQuotes;
  return false;
}

function handleRowBoundary(cursor: CsvCursor, text: string, index: number): boolean {
  pushCurrentCell(cursor);
  commitRowIfNotEmpty(cursor);

  if (text[index] === "\r" && text[index + 1] === "\n") {
    return true;
  }

  return false;
}

function processCsvCharacter(cursor: CsvCursor, text: string, index: number): number {
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

function parseAmount(rawAmount: string): number {
  const trimmed = rawAmount.trim();
  if (trimmed.length === 0) {
    throw new ImportParserError("INVALID_AMOUNT", "Transaction amount is missing.");
  }

  const isParenthesized = trimmed.startsWith("(") && trimmed.endsWith(")");
  const normalized = trimmed
    .replace(/^[($\s]+/, "")
    .replace(/[)$,\s]+$/g, "")
    .split(",")
    .join("")
    .replace(/^\+/, "");

  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) {
    throw new ImportParserError("INVALID_AMOUNT", "Transaction amount is invalid.", {
      amount: rawAmount,
    });
  }

  const resolved = isParenthesized ? -Math.abs(amount) : amount;
  if (resolved === 0) {
    throw new ImportParserError("INVALID_AMOUNT", "Transaction amount cannot be zero.", {
      amount: rawAmount,
    });
  }

  return resolved;
}

function getCell(row: string[], index: number): string {
  return index >= 0 ? row[index] ?? "" : "";
}

function toRawRow(row: string[], headerIndexByName: Record<string, number>, rowNumber: number): TdRawTransactionRow {
  return {
    transactionDate: getCell(row, headerIndexByName.transactionDate),
    description: getCell(row, headerIndexByName.description),
    debitAmount: getCell(row, headerIndexByName.debitAmount),
    creditAmount: getCell(row, headerIndexByName.creditAmount),
    amount: getCell(row, headerIndexByName.amount),
    rowNumber,
  };
}

function hasTransactionData(row: TdRawTransactionRow): boolean {
  return (
    row.transactionDate.trim().length > 0 ||
    row.description.trim().length > 0 ||
    row.debitAmount.trim().length > 0 ||
    row.creditAmount.trim().length > 0 ||
    row.amount.trim().length > 0
  );
}

function resolveAmount(row: TdRawTransactionRow): number {
  if (row.amount.trim().length > 0) {
    return parseAmount(row.amount);
  }

  if (row.debitAmount.trim().length > 0 && row.creditAmount.trim().length > 0) {
    throw new ImportParserError(
      "INVALID_AMOUNT",
      "TD CSV row contains both debit and credit amounts.",
      { rowNumber: row.rowNumber },
    );
  }

  if (row.debitAmount.trim().length > 0) {
    return -Math.abs(parseAmount(row.debitAmount));
  }

  if (row.creditAmount.trim().length > 0) {
    return Math.abs(parseAmount(row.creditAmount));
  }

  throw new ImportParserError("INVALID_AMOUNT", "Transaction amount is missing.", {
    rowNumber: row.rowNumber,
  });
}

export function parseTdCsv(
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

  const detection = detectTdCsvType(rows);

  const rawRows = rows
    .slice(detection.dataStartRow)
    .map((row, index) =>
      toRawRow(
        row,
        detection.headerIndexByName,
        detection.dataStartRow + index + 1,
      ),
    )
    .filter(hasTransactionData);

  if (rawRows.length === 0) {
    throw new ImportParserError(
      "NO_VALID_TRANSACTION_ROWS",
      "CSV has no valid transaction rows.",
    );
  }

  const transactions = rawRows.map((row, index) =>
    normalizeImportedRowToTransaction({
      sourceAccount: detection.sourceAccount,
      originalDate: parseAnyDateToIso(row.transactionDate),
      originalDescription: row.description.trim(),
      originalAmount: resolveAmount(row),
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