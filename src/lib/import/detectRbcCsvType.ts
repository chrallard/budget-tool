import type { SourceAccount } from "../../shared/types/transactions";
import {
  CsvDetectResult,
  ImportParserError,
  RBC_LOCKED_HEADERS,
  RbcLockedHeader,
} from "./types";

function normalizeCell(value: string): string {
  return value.trim();
}

function getHeaderIndexByName(headerRow: string[]): Record<RbcLockedHeader, number> {
  const indexByName = {} as Record<RbcLockedHeader, number>;

  for (const header of RBC_LOCKED_HEADERS) {
    const index = headerRow.findIndex((value) => normalizeCell(value) === header);
    if (index < 0) {
      throw new ImportParserError(
        "MISSING_REQUIRED_COLUMNS",
        "CSV is missing one or more required RBC columns.",
        { missingColumn: header },
      );
    }

    indexByName[header] = index;
  }

  return indexByName;
}

function resolveSourceAccount(accountTypes: string[]): SourceAccount {
  const normalized = new Set(
    accountTypes
      .map((value) => value.trim().toUpperCase())
      .filter((value) => value.length > 0),
  );

  if (normalized.size === 0) {
    throw new ImportParserError(
      "NO_VALID_TRANSACTION_ROWS",
      "CSV has no valid transaction rows.",
    );
  }

  if (normalized.size > 1) {
    throw new ImportParserError(
      "UNSUPPORTED_RBC_FORMAT",
      "CSV mixes account types in one file, which is not supported.",
      { accountTypes: Array.from(normalized.values()) },
    );
  }

  const [accountType] = Array.from(normalized.values());

  if (accountType === "CHEQUING") {
    return "chequing";
  }

  if (accountType === "VISA") {
    return "credit_card";
  }

  throw new ImportParserError(
    "UNSUPPORTED_RBC_FORMAT",
    "CSV account type is not a supported RBC export type.",
    { accountType },
  );
}

export function detectRbcCsvType(csvRows: string[][]): CsvDetectResult {
  if (csvRows.length === 0) {
    throw new ImportParserError("EMPTY_CSV", "CSV file is empty.");
  }

  const headerRow = csvRows[0]?.map((cell) => cell.trim()) ?? [];
  if (headerRow.every((cell) => cell.length === 0)) {
    throw new ImportParserError("INVALID_CSV", "CSV header row is invalid.");
  }

  const headerIndexByName = getHeaderIndexByName(headerRow);
  const accountTypeIndex = headerIndexByName["Account Type"];

  const accountTypes = csvRows
    .slice(1)
    .map((row) => row[accountTypeIndex] ?? "")
    .filter((value) => value.trim().length > 0);

  const sourceAccount = resolveSourceAccount(accountTypes);

  return {
    format: "rbc",
    sourceAccount,
    headerIndexByName,
    dataStartRow: 1,
  };
}
