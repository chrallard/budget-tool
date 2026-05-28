type ImportProgressProps = {
  fileName: string;
  sourceAccount: "chequing" | "credit_card";
  counts: {
    pending: number;
    approved: number;
    skipped: number;
    ignored: number;
  };
};

function formatSourceAccount(sourceAccount: "chequing" | "credit_card"): string {
  return sourceAccount === "chequing" ? "Chequing" : "Credit card";
}

export function ImportProgress({ fileName, sourceAccount, counts }: Readonly<ImportProgressProps>) {
  return (
    <section className="import-progress import-panel" aria-label="Import progress">
      <div>
        <p className="dashboard-eyebrow">Detected source account</p>
        <h2>{formatSourceAccount(sourceAccount)}</h2>
        <p className="dashboard-muted">{fileName}</p>
      </div>
      <dl className="import-progress__stats">
        <div>
          <dt>Pending</dt>
          <dd>{counts.pending}</dd>
        </div>
        <div>
          <dt>Approved</dt>
          <dd>{counts.approved}</dd>
        </div>
        <div>
          <dt>Skipped</dt>
          <dd>{counts.skipped}</dd>
        </div>
        <div>
          <dt>Ignored</dt>
          <dd>{counts.ignored}</dd>
        </div>
      </dl>
    </section>
  );
}