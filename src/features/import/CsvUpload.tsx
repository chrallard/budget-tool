type CsvUploadProps = {
  disabled?: boolean;
  onFileSelected: (file: File) => void;
};

export function CsvUpload({ disabled = false, onFileSelected }: Readonly<CsvUploadProps>) {
  return (
    <section className="import-panel">
      <div className="import-panel__header">
        <div>
          <p className="dashboard-eyebrow">Import Review</p>
          <h1>Upload an RBC or TD CSV</h1>
        </div>
        <p className="import-panel__hint">
          One transaction card is shown at a time so approval decisions stay narrow.
        </p>
      </div>

      <label className="csv-upload" htmlFor="bank-csv-upload">
        <span>Choose an RBC or TD export</span>
        <input
          id="bank-csv-upload"
          type="file"
          accept=".csv,text/csv"
          disabled={disabled}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) {
              return;
            }

            onFileSelected(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
    </section>
  );
}