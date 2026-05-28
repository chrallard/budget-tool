import type { NormalizedTransaction } from "../../shared/types/transactions";

type DuplicateWarningProps = {
  transaction: NormalizedTransaction;
  onSkipDuplicate: () => void;
};

export function DuplicateWarning({ transaction, onSkipDuplicate }: Readonly<DuplicateWarningProps>) {
  if (transaction.duplicateStatus === "not_duplicate") {
    return null;
  }

  const heading =
    transaction.duplicateStatus === "confirmed_duplicate"
      ? "Confirmed duplicate"
      : "Possible duplicate";

  const message =
    transaction.duplicateStatus === "confirmed_duplicate"
      ? "This fingerprint already exists in the sheet metadata. Skipping is strongly recommended."
      : "A similar existing transaction was found. Review the match details before importing anyway.";

  return (
    <section className="duplicate-warning" aria-label="Duplicate warning">
      <div className="duplicate-warning__header">
        <div>
          <h2>{heading}</h2>
          <p>{message}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onSkipDuplicate}>
          Skip as duplicate
        </button>
      </div>

      <ul className="duplicate-warning__list">
        {transaction.duplicateMatches?.map((match) => (
          <li key={`${match.sheetName}-${match.rowNumber ?? 0}-${match.matchReason}`}>
            <strong>{match.vendorOrSource}</strong>
            <span>{match.date}</span>
            <span>${match.amount.toFixed(2)}</span>
            <span>{match.category}</span>
            <span>{match.matchReason}</span>
          </li>
        ))}
      </ul>

      <p className="duplicate-warning__footnote">Use Approve below to import anyway after reviewing the match.</p>
    </section>
  );
}