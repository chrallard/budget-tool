import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { detectDuplicates } from "../../../../lib/import/detectDuplicates";
import {
  fingerprintFromNormalizedTransaction,
  fingerprintTransaction,
} from "../../../../lib/import/fingerprintTransaction";
import { parseBankCsv } from "../../../../lib/import/parseBankCsv";
import { parseRbcCsv } from "../../../../lib/import/parseRbcCsv";
import { suggestCategory } from "../../../../lib/import/suggestCategory";
import { suggestIgnoreReason } from "../../../../lib/import/suggestIgnoreReason";
import { ImportParserError } from "../../../../lib/import/types";
import type { ImportFingerprintRecord } from "../../../../shared/types/transactions";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fixture(name: string): string {
  return readFileSync(resolve(__dirname, "fixtures", name), "utf8");
}

const DEFAULT_EXPENSE_CATEGORIES = [
  "Food",
  "Food out",
  "Coffee out",
  "Gas",
  "Phone",
  "Internet",
  "Hydro",
  "Enbridge",
  "Fitness",
  "Public transportation",
  "Travel",
  "Insurance",
  "Medical",
  "Pets",
  "Mortgage",
  "Rent",
  "Other",
];

const DEFAULT_INCOME_CATEGORIES = ["Salary", "Other"];

function baseOptions(existingRecords: ImportFingerprintRecord[] = []) {
  return {
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    existingRecords,
  };
}

describe("parseRbcCsv", () => {
  it("parses chequing CSV and classifies expenses/income", () => {
    const result = parseRbcCsv(
      fixture("rbc-chequing-valid.csv"),
      baseOptions(),
    );

    expect(result.sourceAccount).toBe("chequing");
    expect(result.transactions).toHaveLength(6);

    const grocery = result.transactions.find((tx) =>
      tx.originalDescription.includes("LOBLAWS"),
    );
    expect(grocery?.direction).toBe("expense");
    expect(grocery?.editableAmount).toBe(151.11);
    expect(grocery?.suggestedCategory).toBe("Food");

    const payroll = result.transactions.find((tx) =>
      tx.originalDescription.includes("PAYROLL"),
    );
    expect(payroll?.direction).toBe("income");
    expect(payroll?.editableAmount).toBe(1200);
  });

  it("parses Visa CSV and detects credit card payment ignore reason", () => {
    const result = parseRbcCsv(fixture("rbc-visa-valid.csv"), baseOptions());

    expect(result.sourceAccount).toBe("credit_card");
    expect(result.transactions).toHaveLength(3);

    const payment = result.transactions.find((tx) =>
      tx.originalDescription.includes("PAYMENT"),
    );
    expect(payment?.ignoreReason).toBe("credit_card_payment");
  });

  it("handles e-transfer sign correctly", () => {
    const result = parseRbcCsv(
      fixture("rbc-chequing-valid.csv"),
      baseOptions(),
    );

    const outgoing = result.transactions.find((tx) =>
      tx.originalDescription.includes("E-TRANSFER FROM JOHN"),
    );
    const incoming = result.transactions.find((tx) =>
      tx.originalDescription.includes("E-TRANSFER FROM EMMA"),
    );

    expect(outgoing?.direction).toBe("expense");
    expect(outgoing?.editableAmount).toBe(50);
    expect(incoming?.direction).toBe("income");
    expect(incoming?.editableAmount).toBe(75);
  });

  it("treats refund rows as negative expenses", () => {
    const result = parseRbcCsv(
      fixture("rbc-chequing-valid.csv"),
      baseOptions(),
    );

    const refund = result.transactions.find((tx) =>
      tx.originalDescription.includes("AMAZON REFUND"),
    );

    expect(refund?.direction).toBe("expense");
    expect(refund?.editableAmount).toBe(-20);
  });

  it("suggests internal transfer ignore reason", () => {
    const result = parseRbcCsv(
      fixture("rbc-chequing-valid.csv"),
      baseOptions(),
    );

    const transfer = result.transactions.find((tx) =>
      tx.originalDescription.includes("ACCOUNT TRANSFER"),
    );

    expect(transfer?.ignoreReason).toBe("internal_transfer");
  });

  it("throws structured error for invalid headers", () => {
    expect(() =>
      parseRbcCsv(fixture("rbc-invalid-headers.csv"), baseOptions()),
    ).toThrowError(ImportParserError);

    try {
      parseRbcCsv(fixture("rbc-invalid-headers.csv"), baseOptions());
      throw new Error("Expected parse to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ImportParserError);
      expect((error as ImportParserError).code).toBe("MISSING_REQUIRED_COLUMNS");
    }
  });

  it("throws structured error for empty CSV text", () => {
    try {
      parseRbcCsv("   ", baseOptions());
      throw new Error("Expected parse to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ImportParserError);
      expect((error as ImportParserError).code).toBe("EMPTY_CSV");
    }
  });

  it("throws structured error when no transaction rows exist", () => {
    try {
      parseRbcCsv(fixture("rbc-no-transactions.csv"), baseOptions());
      throw new Error("Expected parse to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ImportParserError);
      expect((error as ImportParserError).code).toBe("NO_VALID_TRANSACTION_ROWS");
    }
  });

  it("throws structured error for invalid amount values", () => {
    const csv = [
      "Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$",
      "Chequing,1234567,2026-04-29,,LOBLAWS,123,ABC,",
    ].join("\n");

    try {
      parseRbcCsv(csv, baseOptions());
      throw new Error("Expected parse to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ImportParserError);
      expect((error as ImportParserError).code).toBe("INVALID_AMOUNT");
    }
  });

  it("throws structured error for invalid dates", () => {
    const csv = [
      "Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$",
      "Chequing,1234567,2026-99-99,,LOBLAWS,123,-10.00,",
    ].join("\n");

    try {
      parseRbcCsv(csv, baseOptions());
      throw new Error("Expected parse to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ImportParserError);
      expect((error as ImportParserError).code).toBe("INVALID_DATE");
    }
  });

  it("flags exact duplicate matches by fingerprint", () => {
    const existing: ImportFingerprintRecord[] = [
      {
        sheetName: "Expenses",
        date: "04-30-2026",
        vendorOrSource: "LOBLAWS 123",
        amount: 151.11,
        category: "Food",
        importFingerprint: "chequing|2026-04-30|-151.11|LOBLAWS123",
      },
    ];

    const result = parseRbcCsv(
      fixture("rbc-chequing-valid.csv"),
      baseOptions(existing),
    );

    const matched = result.transactions.find(
      (tx) => tx.importFingerprint === existing[0].importFingerprint,
    );

    expect(matched?.duplicateStatus).toBe("confirmed_duplicate");
    expect(matched?.duplicateMatches?.[0]?.matchReason).toBe("exact_fingerprint_match");
  });

  it("flags possible duplicate for same date/amount/similar vendor", () => {
    const existing: ImportFingerprintRecord[] = [
      {
        sheetName: "Expenses",
        date: "04-30-2026",
        vendorOrSource: "LOBLAWS",
        amount: 151.11,
        category: "Food",
        importFingerprint: "other|fingerprint|value",
      },
    ];

    const result = parseRbcCsv(
      fixture("rbc-chequing-valid.csv"),
      baseOptions(existing),
    );

    const matched = result.transactions.find((tx) =>
      tx.originalDescription.includes("LOBLAWS"),
    );

    expect(matched?.duplicateStatus).toBe("possible_duplicate");
    expect(matched?.duplicateMatches?.[0]?.matchReason).toBe(
      "same_date_same_amount_similar_vendor",
    );
  });

  it("flags possible duplicate within plus or minus two days", () => {
    const existing: ImportFingerprintRecord[] = [
      {
        sheetName: "Expenses",
        date: "05-01-2026",
        vendorOrSource: "LOBLAWS",
        amount: 151.11,
        category: "Food",
        importFingerprint: "other|fingerprint|value-2",
      },
    ];

    const result = parseRbcCsv(
      fixture("rbc-chequing-valid.csv"),
      baseOptions(existing),
    );

    const matched = result.transactions.find((tx) =>
      tx.originalDescription.includes("LOBLAWS"),
    );

    expect(matched?.duplicateStatus).toBe("possible_duplicate");
    expect(matched?.duplicateMatches?.[0]?.matchReason).toBe(
      "same_amount_similar_vendor_within_2_days",
    );
  });

  it("ignores invalid suggested categories not present in sheet data", () => {
    const csv = [
      "Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$",
      "Chequing,1234567,2026-05-10,,PAYROLL,DEPOSIT,1000.00,",
    ].join("\n");

    const result = parseRbcCsv(csv, {
      expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
      incomeCategories: ["Salary"],
      existingRecords: [],
    });

    expect(result.transactions[0].direction).toBe("income");
    expect(result.transactions[0].suggestedCategory).toBeUndefined();
    expect(result.transactions[0].selectedCategory).toBeUndefined();
  });
});

describe("parseBankCsv", () => {
  it("parses TD chequing CSV and enters the same review flow", () => {
    const result = parseBankCsv(
      fixture("td-chequing-valid.csv"),
      baseOptions(),
    );

    expect(result.sourceAccount).toBe("chequing");
    expect(result.transactions).toHaveLength(4);

    const grocery = result.transactions.find((tx) =>
      tx.originalDescription.includes("LOBLAWS"),
    );
    expect(grocery?.direction).toBe("expense");
    expect(grocery?.editableAmount).toBe(151.11);

    const payroll = result.transactions.find((tx) =>
      tx.originalDescription.includes("PAYROLL"),
    );
    expect(payroll?.direction).toBe("income");
    expect(payroll?.editableAmount).toBe(1200);
  });

  it("throws structured error for unsupported CSV formats", () => {
    expect(() =>
      parseBankCsv(["Foo,Bar,Baz", "1,2,3"].join("\n"), baseOptions()),
    ).toThrowError(ImportParserError);

    try {
      parseBankCsv(["Foo,Bar,Baz", "1,2,3"].join("\n"), baseOptions());
      throw new Error("Expected parse to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ImportParserError);
      expect((error as ImportParserError).code).toBe("UNSUPPORTED_CSV_FORMAT");
    }
  });
});

describe("fingerprint helpers", () => {
  it("generates fingerprint from original RBC fields", () => {
    const fingerprint = fingerprintTransaction({
      sourceAccount: "chequing",
      originalDate: "2026-04-29",
      originalAmount: -50,
      normalizedDescription: "ETRANSFER",
    });

    expect(fingerprint).toBe("chequing|2026-04-29|-50.00|ETRANSFER");
  });

  it("keeps fingerprint stable when editable amount changes", () => {
    const tx = {
      sourceAccount: "chequing" as const,
      originalDate: "2026-04-29",
      originalAmount: -50,
      normalizedDescription: "ETRANSFER",
      editableAmount: 25,
    };

    const fingerprint = fingerprintFromNormalizedTransaction(tx);
    expect(fingerprint).toBe("chequing|2026-04-29|-50.00|ETRANSFER");
  });
});

describe("standalone helpers", () => {
  it("detectDuplicates supports same date and amount even with vendor mismatch", () => {
    const result = detectDuplicates(
      {
        importFingerprint: "x|y|z|w",
        originalDate: "2026-06-10",
        editableAmount: 42,
        originalDescription: "Vendor A",
      },
      [
        {
          sheetName: "Expenses",
          date: "06-10-2026",
          vendorOrSource: "Different Vendor",
          amount: 42,
          category: "Other",
          importFingerprint: "different",
        },
      ],
    );

    expect(result.duplicateStatus).toBe("possible_duplicate");
    expect(result.duplicateMatches?.[0]?.matchReason).toBe("same_date_same_amount");
  });

  it("suggestIgnoreReason marks payment and transfer patterns", () => {
    expect(suggestIgnoreReason("chequing", "Visa Payment Thank You")).toBe(
      "credit_card_payment",
    );
    expect(suggestIgnoreReason("chequing", "Account Transfer To Savings")).toBe(
      "internal_transfer",
    );
  });

  it("suggestCategory only returns allowed categories", () => {
    const allowed = suggestCategory({
      sourceAccount: "chequing",
      direction: "expense",
      originalDescription: "Starbucks #123",
      expenseCategories: ["Food"],
      incomeCategories: [],
    });

    expect(allowed).toBeUndefined();
  });
});
