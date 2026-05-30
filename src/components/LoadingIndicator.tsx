type LoadingIndicatorProps = {
  label: string;
  centered?: boolean;
};

export function LoadingIndicator({ label, centered = false }: Readonly<LoadingIndicatorProps>) {
  const className = centered
    ? "loading-indicator loading-indicator--centered"
    : "loading-indicator";

  return (
    <div className={className} role="status" aria-live="polite">
      <span className="loading-indicator__shimmer" aria-hidden="true">
        <span className="loading-indicator__shine" />
      </span>
      <span className="visually-hidden">{label}</span>
    </div>
  );
}