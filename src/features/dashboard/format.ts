export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMonthLabel(month: string): string {
  const [year, mm] = month.split("-");
  const date = new Date(Number(year), Number(mm) - 1, 1);
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    year: "numeric",
  }).format(date);
}
