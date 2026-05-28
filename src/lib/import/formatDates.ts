import { ImportParserError } from "./types";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const US_SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const US_DASH_DATE = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function ensureValidDate(year: number, month: number, day: number, raw: string): Date {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new ImportParserError("INVALID_DATE", "Transaction date is invalid.", {
      date: raw,
    });
  }

  return date;
}

export function parseRbcDateToIso(rawDate: string): string {
  const value = rawDate.trim();

  if (value.length === 0) {
    throw new ImportParserError("INVALID_DATE", "Transaction date is missing.", {
      date: rawDate,
    });
  }

  let year: number;
  let month: number;
  let day: number;

  const iso = ISO_DATE.exec(value);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    const slash = US_SLASH_DATE.exec(value);
    if (slash) {
      month = Number(slash[1]);
      day = Number(slash[2]);
      year = Number(slash[3]);
    } else {
      const dash = US_DASH_DATE.exec(value);
      if (!dash) {
        throw new ImportParserError("INVALID_DATE", "Transaction date is invalid.", {
          date: rawDate,
        });
      }

      month = Number(dash[1]);
      day = Number(dash[2]);
      year = Number(dash[3]);
    }
  }

  const date = ensureValidDate(year, month, day, rawDate);
  return [date.getUTCFullYear(), pad2(date.getUTCMonth() + 1), pad2(date.getUTCDate())].join("-");
}

export function formatIsoToMmDdYyyy(isoDate: string): string {
  const parsed = ISO_DATE.exec(isoDate);
  if (!parsed) {
    throw new ImportParserError("INVALID_DATE", "ISO date is invalid.", {
      date: isoDate,
    });
  }

  return `${parsed[2]}-${parsed[3]}-${parsed[1]}`;
}

export function parseAnyDateToIso(dateInput: string): string {
  return parseRbcDateToIso(dateInput);
}
