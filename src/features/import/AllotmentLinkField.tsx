import type { ApiAllotment } from "../../api/client";
import { formatCurrency, formatMonthLabel } from "../dashboard/format";
import { allotmentsForExpense, monthFromDisplayDate } from "./matchingAllotments";

type AllotmentLinkFieldProps = {
  allotments: ApiAllotment[];
  category?: string;
  displayDate: string;
  selectedId?: string;
  onChange: (allotmentId: string) => void;
  label?: string;
  layout?: "card" | "split";
};

export function AllotmentLinkField({
  allotments,
  category,
  displayDate,
  selectedId,
  onChange,
  label = "Allotment",
  layout = "card",
}: Readonly<AllotmentLinkFieldProps>) {
  if (!category) {
    return null;
  }

  const matches = [...allotmentsForExpense(allotments, category, displayDate)].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
  const fieldClass = layout === "split" ? "review-field split-editor__allotment" : "review-field review-field--full";

  if (matches.length === 0) {
    const month = monthFromDisplayDate(displayDate);
    const when = month ? formatMonthLabel(month) : "this date";
    return (
      <p className={`dashboard-muted ${fieldClass}`}>
        No {category} allotments for {when}.
      </p>
    );
  }

  const value = selectedId && matches.some((allotment) => allotment.id === selectedId) ? selectedId : "";

  return (
    <label className={fieldClass}>
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        <option value="">No allotment</option>
        {matches.map((allotment) => (
          <option key={allotment.id} value={allotment.id}>
            {allotment.name} ({formatCurrency(allotment.amount)})
          </option>
        ))}
      </select>
    </label>
  );
}
