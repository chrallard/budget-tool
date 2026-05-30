import { parseRbcCsv } from "./parseRbcCsv";
import { parseTdCsv } from "./parseTdCsv";
import { ImportParserError } from "./types";
import type { ParseRbcCsvOptions, ParseRbcCsvResult } from "./types";

function isImportParserError(error: unknown): error is ImportParserError {
  return error instanceof Error && error.name === "ImportParserError";
}

function isRbcLikeHeader(csvText: string): boolean {
  const headerLine = csvText.split(/\r?\n/, 1)[0] ?? "";
  return (
    headerLine.includes("Account Type") ||
    headerLine.includes("Cheque Number") ||
    headerLine.includes("CAD$") ||
    headerLine.includes("USD$")
  );
}

function parseWithRbc(csvText: string, options: ParseRbcCsvOptions): ParseRbcCsvResult | ImportParserError {
  try {
    return parseRbcCsv(csvText, options);
  } catch (error) {
    if (isImportParserError(error)) {
      return error;
    }

    throw error;
  }
}

function parseWithTd(csvText: string, options: ParseRbcCsvOptions): ParseRbcCsvResult | ImportParserError {
  try {
    return parseTdCsv(csvText, options);
  } catch (error) {
    if (isImportParserError(error)) {
      return error;
    }

    throw error;
  }
}

function shouldPreferSpecificError(error: ParseRbcCsvResult | ImportParserError): error is ImportParserError {
  return error instanceof ImportParserError && error.code !== "MISSING_REQUIRED_COLUMNS";
}

export function parseBankCsv(
  csvText: string,
  options: ParseRbcCsvOptions,
): ParseRbcCsvResult {
  if (csvText.trim().length === 0) {
    throw new ImportParserError("EMPTY_CSV", "CSV file is empty.");
  }

  const rbcResult = parseWithRbc(csvText, options);
  if (!(rbcResult instanceof Error)) {
    return rbcResult;
  }

  const tdResult = parseWithTd(csvText, options);
  if (!(tdResult instanceof Error)) {
    return tdResult;
  }

  if (shouldPreferSpecificError(rbcResult)) {
    throw rbcResult;
  }

  if (shouldPreferSpecificError(tdResult)) {
    throw tdResult;
  }

  if (isRbcLikeHeader(csvText) && isImportParserError(rbcResult)) {
    throw rbcResult;
  }

  throw new ImportParserError(
    "UNSUPPORTED_CSV_FORMAT",
    "CSV format is not a supported RBC or TD export.",
  );
}