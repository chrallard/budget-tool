import type {
  DuplicateMatch,
  ImportFingerprintRecord,
  NormalizedTransaction,
} from "../../shared/types/transactions";
import { parseAnyDateToIso } from "./formatDates";
import { normalizeVendorForSimilarity } from "./normalizeDescription";
import type { TransactionDuplicateResult } from "./types";

function amountEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.000001;
}

function datesWithinTwoDays(leftIso: string, rightIso: string): boolean {
  const left = new Date(`${leftIso}T00:00:00.000Z`).getTime();
  const right = new Date(`${rightIso}T00:00:00.000Z`).getTime();
  const diffDays = Math.abs(left - right) / (1000 * 60 * 60 * 24);
  return diffDays <= 2;
}

function similarVendor(incoming: string, existing: string): boolean {
  const a = normalizeVendorForSimilarity(incoming);
  const b = normalizeVendorForSimilarity(existing);

  if (a.length === 0 || b.length === 0) {
    return false;
  }

  return a === b || a.includes(b) || b.includes(a);
}

function usesRefundSemantics(description: string): boolean {
  const upper = description.toUpperCase();
  return (
    upper.includes("REFUND") ||
    upper.includes("REVERSAL") ||
    upper.includes("RETURN") ||
    upper.includes("CHARGEBACK")
  );
}

function originalAmountToComparable(
  originalAmount: number,
  originalDescription: string,
): number {
  if (usesRefundSemantics(originalDescription)) {
    return -Math.abs(originalAmount);
  }

  if (originalAmount < 0) {
    return Math.abs(originalAmount);
  }

  return originalAmount;
}

function resolvePossibleDuplicateAmount(
  tx: Pick<NormalizedTransaction, "editableAmount" | "originalDescription"> & {
    originalAmount?: number;
  },
): number {
  if (typeof tx.originalAmount === "number" && Number.isFinite(tx.originalAmount)) {
    return originalAmountToComparable(tx.originalAmount, tx.originalDescription);
  }

  return tx.editableAmount;
}

function toDuplicateMatch(
  record: ImportFingerprintRecord,
  matchReason: string,
): DuplicateMatch {
  return {
    sheetName: record.sheetName,
    rowNumber: record.rowNumber,
    date: record.date,
    vendorOrSource: record.vendorOrSource,
    amount: record.amount,
    category: record.category,
    importFingerprint: record.importFingerprint,
    matchReason,
  };
}

function detectPossibleMatches(
  tx: Pick<
    NormalizedTransaction,
    "originalDate" | "editableAmount" | "originalDescription"
  > & { originalAmount?: number },
  records: ImportFingerprintRecord[],
): DuplicateMatch[] {
  const txDateIso = parseAnyDateToIso(tx.originalDate);
  const txAmount = resolvePossibleDuplicateAmount(tx);

  const matches: DuplicateMatch[] = [];

  for (const record of records) {
    const recordDateIso = parseAnyDateToIso(record.date);
    const hasSameDate = txDateIso === recordDateIso;
    const hasSameAmount = amountEqual(txAmount, record.amount);
    const hasSimilarVendor = similarVendor(tx.originalDescription, record.vendorOrSource);

    if (hasSameDate && hasSameAmount && hasSimilarVendor) {
      matches.push(toDuplicateMatch(record, "same_date_same_amount_similar_vendor"));
      continue;
    }

    if (hasSameAmount && hasSimilarVendor && datesWithinTwoDays(txDateIso, recordDateIso)) {
      matches.push(toDuplicateMatch(record, "same_amount_similar_vendor_within_2_days"));
      continue;
    }

    if (hasSameDate && hasSameAmount) {
      matches.push(toDuplicateMatch(record, "same_date_same_amount"));
    }
  }

  return matches;
}

export function detectDuplicates(
  tx: Pick<
    NormalizedTransaction,
    "importFingerprint" | "originalDate" | "editableAmount" | "originalDescription"
  > & {
    originalAmount?: number;
  },
  existingRecords: ImportFingerprintRecord[],
): TransactionDuplicateResult {
  const exactMatches = existingRecords.filter(
    (record) =>
      record.importFingerprint.trim().length > 0 &&
      record.importFingerprint === tx.importFingerprint,
  );

  if (exactMatches.length > 0) {
    return {
      duplicateStatus: "confirmed_duplicate",
      duplicateMatches: exactMatches.map((record) =>
        toDuplicateMatch(record, "exact_fingerprint_match"),
      ),
    };
  }

  const possibleMatches = detectPossibleMatches(tx, existingRecords);
  if (possibleMatches.length > 0) {
    return {
      duplicateStatus: "possible_duplicate",
      duplicateMatches: possibleMatches,
    };
  }

  return {
    duplicateStatus: "not_duplicate",
  };
}
