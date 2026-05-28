import type {
  NormalizedTransaction,
  SourceAccount,
} from "../../shared/types/transactions";

type FingerprintInput = {
  sourceAccount: SourceAccount;
  originalDate: string;
  originalAmount: number;
  normalizedDescription: string;
};

function formatAmount(value: number): string {
  return value.toFixed(2);
}

export function fingerprintTransaction(input: FingerprintInput): string {
  return [
    input.sourceAccount,
    input.originalDate,
    formatAmount(input.originalAmount),
    input.normalizedDescription,
  ].join("|");
}

export function fingerprintFromNormalizedTransaction(
  tx: Pick<
    NormalizedTransaction,
    "sourceAccount" | "originalDate" | "originalAmount" | "normalizedDescription"
  >,
): string {
  return fingerprintTransaction(tx);
}
