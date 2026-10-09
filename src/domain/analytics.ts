import type {
  AnalyticsMetrics,
  DischargeRequest,
  Patient,
  PatientOutcome,
} from "./types";
import { differenceInCalendarDays, parseISO } from "date-fns";

export function computeAnalytics(
  patients: Patient[],
  outcomes: PatientOutcome[],
  dischargeRequests: DischargeRequest[],
): AnalyticsMetrics {
  const deaths = outcomes.filter((o) => o.outcomeType === "death").length;
  const survivors = patients.filter((p) => p.status === "discharged").length;
  const completedDischarges = survivors;
  const resolvedOutcomes = deaths + survivors;
  const activeCensus = patients.filter((p) => p.status === "admitted").length;
  const totalAdmissions = patients.length;

  let mortalityRate: number | null = null;
  let survivalRate: number | null = null;
  if (resolvedOutcomes > 0) {
    mortalityRate = (deaths / resolvedOutcomes) * 100;
    survivalRate = (survivors / resolvedOutcomes) * 100;
  }

  const dischargedPatients = patients.filter(
    (p) => p.status === "discharged" || p.status === "deceased",
  );
  let avgLengthOfStayDays: number | null = null;
  if (dischargedPatients.length > 0) {
    const totalDays = dischargedPatients.reduce((sum, p) => {
      const outcome = outcomes.find((o) => o.patientId === p.id);
      const discharge = dischargeRequests.find(
        (r) => r.patientId === p.id && r.status === "completed",
      );
      const endIso =
        outcome?.outcomeAt ??
        discharge?.processedAt ??
        p.updatedAt;
      return (
        sum +
        Math.max(
          0,
          differenceInCalendarDays(parseISO(endIso), parseISO(p.admittedAt)),
        )
      );
    }, 0);
    avgLengthOfStayDays = totalDays / dischargedPatients.length;
  }

  return {
    totalAdmissions,
    completedDischarges,
    activeCensus,
    deaths,
    resolvedOutcomes,
    mortalityRate,
    survivalRate,
    avgLengthOfStayDays,
    mortalityExceedsBenchmark:
      mortalityRate !== null && mortalityRate > 15,
  };
}
