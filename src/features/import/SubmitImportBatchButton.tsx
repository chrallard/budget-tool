type SubmitImportBatchButtonProps = {
  approvedCount: number;
  pendingCount: number;
  disabled: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export function SubmitImportBatchButton({
  approvedCount,
  pendingCount,
  disabled,
  isSubmitting,
  onSubmit,
}: Readonly<SubmitImportBatchButtonProps>) {
  let helperText = "Only approved transactions will be submitted.";

  if (pendingCount > 0) {
    helperText = "Review all pending transactions before submitting the batch.";
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
        {isSubmitting ? "Submitting approved batch..." : `Submit ${approvedCount} approved transaction${approvedCount === 1 ? "" : "s"}`}
      </button>
      <p className="dashboard-muted">{helperText}</p>
    </div>
  );
}