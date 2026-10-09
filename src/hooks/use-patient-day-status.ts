import { useMemo } from "react";
import { useApp } from "@/contexts/app-provider";
import { todayFacilityDate } from "@/domain/dates";
import { hasRoutineReadingForDate, isFever } from "@/domain/temperature";

export function usePatientDayStatus(patientId: string) {
  const { repo } = useApp();
  const settings = repo.getSettings();
  const today = todayFacilityDate(settings.timezone);

  return useMemo(() => {
    const readings = repo.getPatientReadings(patientId);
    const todayReading = hasRoutineReadingForDate(readings, today);
    const visit = repo
      .getPatientVisits(patientId)
      .find((v) => v.facilityLocalDate === today);
    const feverFree = repo.getFeverFree(patientId);
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
  }, [patientId, repo, settings.feverThresholdCelsius, today]);
}