import { addDays, format, parseISO } from "date-fns";

/** Facility-local calendar date as YYYY-MM-DD (ISO date in that timezone). */
export function toFacilityLocalDate(
  date: Date | string,
  timezone: string,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

export function todayFacilityDate(timezone: string): string {
  return toFacilityLocalDate(new Date(), timezone);
}

export function enumerateLocalDates(
  fromDate: string,
  toDate: string,
): string[] {
  const dates: string[] = [];
  let current = fromDate;
  while (current <= toDate) {
    dates.push(current);
    current = format(addDays(parseISO(current), 1), "yyyy-MM-dd");
  }
  return dates;
}

export function daysBetweenAdmissionAndToday(
  admittedAt: string,
  timezone: string,
): string[] {
  const start = toFacilityLocalDate(admittedAt, timezone);
  const end = todayFacilityDate(timezone);
  return enumerateLocalDates(start, end);
}
