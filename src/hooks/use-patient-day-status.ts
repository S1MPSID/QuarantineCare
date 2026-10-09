import { useMemo } from "react";
import { useApp } from "@/contexts/app-provider";
import { todayFacilityDate } from "@/domain/dates";
import { hasRoutineReadingForDate, isFever } from "@/domain/temperature";
import type { Patient } from "@/domain/types";

export function usePatientDayStatus(patient: Patient) {
  const { repo } = useApp();
  const settings = repo.getSettings();
  const today = todayFacilityDate(settings.timezone);

  return useMemo(() => {
    const readings = repo.getPatientReadings(patient.id);
    const todayReading = hasRoutineReadingForDate(readings, today);
    const visit = repo
      .getPatientVisits(patient.id)
      .find((v) => v.facilityLocalDate === today);
    const feverFree = repo.getFeverFree(patient.id);
    const latest = readings[0];
    return {
      today,
      todayReading,
      visit,
      feverFree,
      latest,
      hasFeverToday:
        todayReading &&
        isFever(todayReading.temperatureCelsius, settings.feverThresholdCelsius),
    };
  }, [patient.id, repo, settings.feverThresholdCelsius, settings.timezone, today]);
}
