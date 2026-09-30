type SubmitImportBatchButtonProps = {
  approvedCount: number;
  pendingCount: number;
  dismissedCount: number;
  disabled: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export function SubmitImportBatchButton({
  approvedCount,
  pendingCount,
  dismissedCount,
  disabled,
  isSubmitting,
  onSubmit,
}: Readonly<SubmitImportBatchButtonProps>) {
  let helperText = "Only approved transactions will be submitted.";
  let buttonLabel = `Submit ${approvedCount} approved transaction${approvedCount === 1 ? "" : "s"}`;

  if (pendingCount > 0) {
    helperText = "Review all pending transactions before submitting the batch.";
  } else if (approvedCount === 0 && dismissedCount > 0) {
    helperText = "Skipped and ignored transactions will stay out of the next import.";
    buttonLabel = "Remember skipped transactions";
  } else if (dismissedCount > 0) {
    helperText = "Approved rows are written. Skipped and ignored rows stay out of the next import.";
  } else if (approvedCount === 0) {
    helperText = "There are no approved transactions to submit.";
  }

  return (
    <div className="submit-batch">
      <button
        type="button"
        className="primary-button"
        disabled={disabled}
        onClick={onSubmit}
      >
        {isSubmitting ? "Submitting approved batch..." : buttonLabel}
      </button>
      <p className="dashboard-muted">{helperText}</p>
    </div>
  );
}