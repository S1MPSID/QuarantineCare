import type {
  DashboardMetrics,
  DischargeRequest,
  DoctorVisit,
  Patient,
  TemperatureReading,
} from "./types";
import { calculateFeverFreeStreak } from "./temperature";
import { todayFacilityDate } from "./dates";

export function computeDashboardMetrics(
  patients: Patient[],
  readings: TemperatureReading[],
  visits: DoctorVisit[],
  dischargeRequests: DischargeRequest[],
  maxCapacity: number,
  feverThreshold: number,
  timezone: string,
): DashboardMetrics {
  const admitted = patients.filter((p) => p.status === "admitted");
  const today = todayFacilityDate(timezone);
  const occupiedBeds = admitted.length;

  let tempCompletedToday = 0;
  let visitsCompletedToday = 0;
  let dischargeCandidates = 0;

  for (const p of admitted) {
    const pReadings = readings.filter((r) => r.patientId === p.id);
    const hasTemp = pReadings.some((r) => r.facilityLocalDate === today && !r.correctionOfId);
    const hasCorrection = pReadings.some((r) => r.facilityLocalDate === today);
    if (hasTemp || hasCorrection) tempCompletedToday++;
    const hasVisit = visits.some(
      (v) => v.patientId === p.id && v.facilityLocalDate === today,
    );
    if (hasVisit) visitsCompletedToday++;

    const streak = calculateFeverFreeStreak(
      pReadings,
      feverThreshold,
      timezone,
      p.admittedAt,
    );
    const openRequest = dischargeRequests.find(
      (r) =>
        r.patientId === p.id &&
        (r.status === "awaiting_administration" || r.status === "completed"),
    );
    if (streak.eligibleForDischarge && !openRequest) {
      dischargeCandidates++;
    }
  }

  const tempPendingToday = admitted.length - tempCompletedToday;
  const visitsPendingToday = admitted.length - visitsCompletedToday;
  const dischargeAwaitingAdmin = dischargeRequests.filter(
    (r) => r.status === "awaiting_administration",
  ).length;

  const denom = admitted.length || 1;

  return {
    totalAdmitted: admitted.length,
    occupiedBeds,
    maxCapacity,
    availableBeds: Math.max(0, maxCapacity - occupiedBeds),
    tempCompletedToday,
    tempPendingToday,
    visitsCompletedToday,
    visitsPendingToday,
    dischargeCandidates,
    dischargeAwaitingAdmin,
    tempCompletionRate: (tempCompletedToday / denom) * 100,
    visitCompletionRate: (visitsCompletedToday / denom) * 100,
  };
}
