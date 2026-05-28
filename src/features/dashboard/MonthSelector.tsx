import { formatMonthLabel } from "./format";

type MonthSelectorProps = {
  selectedMonth: string;
  months: string[];
  onChange: (month: string) => void;
};

export function MonthSelector({ selectedMonth, months, onChange }: Readonly<MonthSelectorProps>) {
  return (
    <label className="month-selector">
      <span>Month</span>
      <select
        aria-label="Month"
        value={selectedMonth}
        onChange={(event) => onChange(event.target.value)}
      >
        {months.map((month) => (
          <option key={month} value={month}>
            {formatMonthLabel(month)}
          </option>
        ))}
      </select>
    </label>
  );
}
