import type { ApiAllotment } from "../../api/client";

export function monthFromDisplayDate(displayDate: string): string | null {
  const match = /^(\d{2})-\d{2}-(\d{4})$/.exec(displayDate.trim());
  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  if (month < 1 || month > 12) {
    return null;
  }

  return `${match[2]}-${match[1]}`;
}

export function previousMonth(month: string): string | null {
  return shiftMonth(month, -1);
}

export function spendingMonth(profitMonth: string): string | null {
  return shiftMonth(profitMonth, 1);
}

export function allotmentsForExpense(
  allotments: ApiAllotment[],
  category: string | undefined,
  displayDate: string,
): ApiAllotment[] {
  if (!category) {
    return [];
  }

  const month = monthFromDisplayDate(displayDate);
  if (!month) {
    return [];
  }

  return allotments.filter(
    (allotment) => allotment.category === category && spendingMonth(allotment.profitMonth) === month,
  );
}

export function profitMonthsForExpenses(displayDates: string[]): string[] {
  const months = new Set<string>();

  for (const displayDate of displayDates) {
    const month = monthFromDisplayDate(displayDate);
    if (!month) {
      continue;
    }

    const profitMonth = previousMonth(month);
    if (profitMonth) {
      months.add(profitMonth);
    }
  }

  return [...months];
}

function shiftMonth(month: string, delta: number): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  if (monthIndex < 1 || monthIndex > 12) {
    return null;
  }

  const shifted = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${mm}`;
}
