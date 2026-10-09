import type { TemperatureReading } from "./types";
import { daysBetweenAdmissionAndToday, todayFacilityDate } from "./dates";

const MIN_TEMP = 30;
const MAX_TEMP = 45;

export function validateTemperature(value: number): string | null {
  if (Number.isNaN(value)) return "Temperature must be a number.";
  if (value < MIN_TEMP || value > MAX_TEMP) {
    return `Temperature must be between ${MIN_TEMP}°C and ${MAX_TEMP}°C.`;
  }
  return null;
}

/** Latest routine reading per facility local date (excludes correction records as primary). */
export function readingsByLocalDate(
  readings: TemperatureReading[],
): Map<string, TemperatureReading> {
  const map = new Map<string, TemperatureReading>();
  const sorted = [...readings].sort(
    (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
  );
  for (const r of sorted) {
    if (r.correctionOfId) continue;
    map.set(r.facilityLocalDate, r);
  }
  for (const r of sorted) {
    if (!r.correctionOfId) continue;
    const original = map.get(r.facilityLocalDate);
    if (original && original.id === r.correctionOfId) {
      map.set(r.facilityLocalDate, r);
    }
  }
  return map;
}

export function isFever(
  temp: number,
  threshold: number,
): boolean {
  return temp >= threshold;
}

export function calculateFeverFreeStreak(
  readings: TemperatureReading[],
  threshold: number,
  timezone: string,
  admittedAt: string,
  asOfDate?: string,
): {
  streak: number;
  qualifyingDates: string[];
  eligibleForDischarge: boolean;
  explanation: string;
} {
  const end = asOfDate ?? todayFacilityDate(timezone);
  const byDate = readingsByLocalDate(readings);
  const allDays = daysBetweenAdmissionAndToday(admittedAt, timezone).filter(
    (d) => d <= end,
  );

  let streak = 0;
  const qualifyingDates: string[] = [];

  for (let i = allDays.length - 1; i >= 0; i--) {
    const day = allDays[i];
    const reading = byDate.get(day);
    if (!reading) {
      break;
    }
    if (isFever(reading.temperatureCelsius, threshold)) {
      break;
    }
    streak++;
    qualifyingDates.unshift(day);
  }

  const eligible = streak >= 3;
  const explanation = eligible
    ? `Patient has ${streak} consecutive fever-free calendar day(s) with recorded temperatures below ${threshold}°C (most recent: ${qualifyingDates.slice(-3).join(", ")}).`
    : streak > 0
      ? `Only ${streak} consecutive fever-free day(s). Need 3 complete calendar days with recorded sub-threshold temperatures. Missing readings do not count.`
      : "No qualifying fever-free streak. Each calendar day requires a recorded temperature below the fever threshold.";

  return {
    streak,
    qualifyingDates,
    eligibleForDischarge: eligible,
    explanation,
  };
}

export function hasRoutineReadingForDate(
  readings: TemperatureReading[],
  localDate: string,
): TemperatureReading | undefined {
  return readingsByLocalDate(readings).get(localDate);
}
