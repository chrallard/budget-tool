import { describe, expect, it } from "vitest";

import { detectDuplicates } from "../detectDuplicates";
import { fingerprintTransaction } from "../fingerprintTransaction";
import type { ImportFingerprintRecord } from "../../../shared/types/transactions";

function makeRecord(overrides: Partial<ImportFingerprintRecord> = {}): ImportFingerprintRecord {
  return {
    sheetName: "Expenses",
    rowNumber: 14,
    date: "04-30-2026",
    vendorOrSource: "LOBLAWS 123",
    amount: 151.11,
    category: "Food",
    importFingerprint: "chequing|2026-04-30|-151.11|LOBLAWS123",
    sourceAccount: "chequing",
    originalDate: "2026-04-30",
    originalAmount: -151.11,
    originalDescription: "LOBLAWS 123",
    ...overrides,
  };
}

describe("detectDuplicates", () => {
  it("returns confirmed duplicate for exact fingerprint matches", () => {
    const result = detectDuplicates(
      {
        importFingerprint: "chequing|2026-04-30|-151.11|LOBLAWS123",
        originalDate: "2026-04-30",
        originalAmount: -151.11,
        editableAmount: 151.11,
        originalDescription: "LOBLAWS 123",
      },
      [makeRecord()],
    );

    expect(result.duplicateStatus).toBe("confirmed_duplicate");
    expect(result.duplicateMatches).toEqual([
      expect.objectContaining({
        matchReason: "exact_fingerprint_match",
        vendorOrSource: "LOBLAWS 123",
      }),
    ]);
  });

  it("returns possible duplicate for same date and amount despite vendor differences", () => {
    const result = detectDuplicates(
      {
        importFingerprint: fingerprintTransaction({
          sourceAccount: "chequing",
          originalDate: "2026-04-30",
          originalAmount: -151.11,
          normalizedDescription: "LOBLAWSSTORE123",
        }),
        originalDate: "2026-04-30",
        originalAmount: -151.11,
        editableAmount: 151.11,
        originalDescription: "LOBLAWS STORE 123",
      },
      [
        makeRecord({
          importFingerprint: "different|fingerprint|value",
          vendorOrSource: "Loblaws #123",
        }),
      ],
    );

    expect(result.duplicateStatus).toBe("possible_duplicate");
    expect(result.duplicateMatches).toEqual([
      expect.objectContaining({
        matchReason: "same_date_same_amount",
      }),
    ]);
  });

  it("returns possible duplicate for same amount and vendor within plus or minus two days", () => {
    const result = detectDuplicates(
      {
        importFingerprint: fingerprintTransaction({
          sourceAccount: "chequing",
          originalDate: "2026-04-30",
          originalAmount: -151.11,
          normalizedDescription: "LOBLAWS123",
        }),
        originalDate: "2026-04-30",
        originalAmount: -151.11,
        editableAmount: 151.11,
        originalDescription: "LOBLAWS 123",
      },
      [
        makeRecord({
          date: "05-02-2026",
          importFingerprint: "different|fingerprint|value-2",
        }),
      ],
    );

    expect(result.duplicateStatus).toBe("possible_duplicate");
    expect(result.duplicateMatches).toEqual([
      expect.objectContaining({
        matchReason: "same_amount_similar_vendor_within_2_days",
      }),
    ]);
  });

  it("uses original imported amount semantics even after editable amount is overridden", () => {
    const result = detectDuplicates(
      {
        importFingerprint: fingerprintTransaction({
          sourceAccount: "chequing",
          originalDate: "2026-04-30",
          originalAmount: -151.11,
          normalizedDescription: "LOBLAWS123",
        }),
        originalDate: "2026-04-30",
        originalAmount: -151.11,
        editableAmount: 130,
        originalDescription: "LOBLAWS 123",
      },
      [
        makeRecord({
          importFingerprint: "different|fingerprint|value-3",
        }),
      ],
    );

    expect(result.duplicateStatus).toBe("possible_duplicate");
    expect(result.duplicateMatches).toEqual([
      expect.objectContaining({
        matchReason: "same_date_same_amount_similar_vendor",
      }),
    ]);
  });

  it("uses original imported amount semantics for within plus or minus two day matches", () => {
    const result = detectDuplicates(
      {
        importFingerprint: fingerprintTransaction({
          sourceAccount: "chequing",
          originalDate: "2026-04-30",
          originalAmount: -151.11,
          normalizedDescription: "LOBLAWS123",
        }),
        originalDate: "2026-04-30",
        originalAmount: -151.11,
        editableAmount: 99,
        originalDescription: "LOBLAWS 123",
      },
      [
        makeRecord({
          date: "05-01-2026",
          importFingerprint: "different|fingerprint|value-4",
        }),
      ],
    );

    expect(result.duplicateStatus).toBe("possible_duplicate");
    expect(result.duplicateMatches).toEqual([
      expect.objectContaining({
        matchReason: "same_amount_similar_vendor_within_2_days",
      }),
    ]);
  });
});