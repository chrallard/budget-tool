import type { IgnoreReason, SourceAccount } from "../../shared/types/transactions";
import { normalizeVendorForSimilarity } from "./normalizeDescription";

const INTERNAL_TRANSFER_PATTERNS = [
  "TRANSFER",
  "ACCOUNT TRANSFER",
  "INT TRANSFER",
  "E TRANSFER TO",
  "E TRANSFER FROM",
  "XFER",
];

const CREDIT_CARD_PAYMENT_PATTERNS = [
  "VISA PAYMENT",
  "CREDIT CARD PAYMENT",
  "PAYMENT THANK YOU",
  "PAYMENT RECEIVED",
  "RBC VISA",
];

export function suggestIgnoreReason(
  sourceAccount: SourceAccount,
  originalDescription: string,
): IgnoreReason | undefined {
  const normalized = normalizeVendorForSimilarity(originalDescription);

  if (
    CREDIT_CARD_PAYMENT_PATTERNS.some((pattern) => normalized.includes(pattern))
  ) {
    return "credit_card_payment";
  }

  if (sourceAccount === "credit_card" && normalized.startsWith("PAYMENT")) {
    return "credit_card_payment";
  }

  if (
    INTERNAL_TRANSFER_PATTERNS.some((pattern) => normalized.includes(pattern))
  ) {
    return "internal_transfer";
  }

  return undefined;
}
