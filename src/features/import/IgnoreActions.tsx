import type { IgnoreReason } from "../../shared/types/transactions";

type IgnoreActionsProps = {
  suggestedReason?: IgnoreReason;
  onIgnore: (reason: IgnoreReason) => void;
};

function labelForReason(reason: IgnoreReason): string {
  switch (reason) {
    case "internal_transfer":
      return "internal transfer";
    case "credit_card_payment":
      return "credit card payment";
    case "duplicate":
      return "duplicate";
    case "other":
      return "other";
  }
}

export function IgnoreActions({ suggestedReason, onIgnore }: Readonly<IgnoreActionsProps>) {
  return (
    <div className="ignore-actions">
      <p className="dashboard-muted">
        {suggestedReason
          ? `Suggested ignore reason: ${labelForReason(suggestedReason)}.`
          : "Ignore if this item should not be written to the sheet."}
      </p>
      <div className="import-action-row">
        <button type="button" className="ghost-button" onClick={() => onIgnore("internal_transfer")}>
          Mark internal transfer
        </button>
        <button type="button" className="ghost-button" onClick={() => onIgnore("credit_card_payment")}>
          Mark credit card payment
        </button>
        <button type="button" className="ghost-button" onClick={() => onIgnore("other")}>
          Ignore transaction
        </button>
      </div>
    </div>
  );
}