"use client";

import { useParams } from "next/navigation";
import { useApp } from "@/contexts/app-provider";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTemp } from "@/lib/utils";
import { usePatientDayStatus } from "@/hooks/use-patient-day-status";

export default function PatientDetailPage() {
  const params = useParams();
  const { repo, role } = useApp();
  const patient = repo.getPatient(String(params.id));

  if (!patient) {
    return <p className="text-sm text-slate-500">Patient not found.</p>;
  }

  const status = usePatientDayStatus(patient);
  const room = repo.getDatabase().rooms.find((r) => r.id === patient.roomId);
  const readings = repo.getPatientReadings(patient.id);
  const visits = repo.getPatientVisits(patient.id);
  const settings = repo.getSettings();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{patient.fullName}</h1>
          <p className="text-sm text-slate-500">{patient.patientCode} · Room {room?.roomNumber}</p>
        </div>
        <Badge className="capitalize">{patient.status}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardTitle>Age</CardTitle>
          <p className="mt-2 text-xl font-semibold">{patient.age}</p>
        </Card>
        <Card>
          <CardTitle>Admitted</CardTitle>
          <p className="mt-2 text-sm">{new Date(patient.admittedAt).toLocaleString()}</p>
        </Card>
        <Card>
          <CardTitle>Fever-free streak</CardTitle>
          <p className="mt-2 text-xl font-semibold">{status.feverFree?.streak ?? 0} days</p>
        </Card>
      </div>

      <Card>
        <CardTitle className="mb-2">Discharge eligibility</CardTitle>
        <p className="text-sm text-slate-600">{status.feverFree?.explanation}</p>
        <p className="mt-2 text-xs text-slate-500">
          Calendar-day rule: each facility-local day needs a recorded temperature below {settings.feverThresholdCelsius}°C (demo default). Missing readings never count as fever-free.
        </p>
        {status.feverFree?.eligibleForDischarge && (
          <Badge variant="success" className="mt-3">Meets 3-day fever-free criterion</Badge>
        )}
      </Card>

      {(role === "doctor" || role === "administrator") && (
        <Card>
          <CardTitle className="mb-3">Treatment notes</CardTitle>
          <ul className="space-y-2 text-sm">
            {visits.length === 0 ? (
              <li className="text-slate-500">No doctor visits recorded.</li>
            ) : (
              visits.map((v) => (
                <li key={v.id} className="rounded-lg border border-slate-100 p-3">
                  <p className="font-medium">{new Date(v.visitedAt).toLocaleString()}</p>
                  <p className="text-slate-600">{v.clinicalNotes}</p>
                  {v.treatmentPlan && <p className="mt-1 text-slate-500">Plan: {v.treatmentPlan}</p>}
                  {v.temperatureMissingFlag && <Badge variant="warning" className="mt-2">Today&apos;s nursing temperature was missing at visit time</Badge>}
                </li>
              ))
            )}
          </ul>
        </Card>
      )}

      <Card>
        <CardTitle className="mb-3">Temperature history</CardTitle>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Temp</th>
                <th className="py-2 pr-4">Recorded</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4">{r.facilityLocalDate}</td>
                  <td className="py-2 pr-4">{formatTemp(r.temperatureCelsius)}{r.correctionOfId ? " (correction)" : ""}</td>
                  <td className="py-2 pr-4">{new Date(r.observedAt).toLocaleString()}</td>
                  <td className="py-2">{r.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">Audit trail (recent)</CardTitle>
        <ul className="text-sm text-slate-600">
          {repo
            .getAuditLogs(20)
            .filter((l) => l.entityId === patient.id)
            .map((l) => (
              <li key={l.id}>{l.action} — {new Date(l.timestamp).toLocaleString()}</li>
            ))}
        </ul>
      </Card>
    </div>
  );
}
