"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/contexts/app-provider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatTemp } from "@/lib/utils";
import { usePatientDayStatus } from "@/hooks/use-patient-day-status";

function PatientRow({ patientId }: { patientId: string }) {
  const { repo } = useApp();
  const patient = repo.getPatient(patientId)!;
  const status = usePatientDayStatus(patient);
  const room = repo.getDatabase().rooms.find((r) => r.id === patient.roomId);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/80">
      <td className="px-3 py-3 text-sm font-medium">{patient.patientCode}</td>
      <td className="px-3 py-3 text-sm">{patient.fullName}</td>
      <td className="px-3 py-3 text-sm">{patient.age}</td>
      <td className="px-3 py-3 text-sm">{room?.roomNumber ?? "—"}</td>
      <td className="px-3 py-3 text-sm">{new Date(patient.admittedAt).toLocaleDateString()}</td>
      <td className="px-3 py-3 text-sm">{status.latest ? formatTemp(status.latest.temperatureCelsius) : "—"}</td>
      <td className="px-3 py-3">
        {status.todayReading ? (
          <Badge variant="success">Complete</Badge>
        ) : patient.status === "admitted" ? (
          <Badge variant="warning">Pending</Badge>
        ) : (
          <Badge>N/A</Badge>
        )}
      </td>
      <td className="px-3 py-3">
        {status.visit ? <Badge variant="success">Complete</Badge> : patient.status === "admitted" ? <Badge variant="warning">Pending</Badge> : <Badge>N/A</Badge>}
      </td>
      <td className="px-3 py-3 text-sm">{status.feverFree?.streak ?? 0} days</td>
      <td className="px-3 py-3 capitalize text-sm">{patient.status}</td>
      <td className="px-3 py-3">
        <Link href={`/patients/${patient.id}`} className="text-sm font-medium text-teal-700 hover:underline">
          Open
        </Link>
      </td>
    </tr>
  );
}

export default function PatientsPage() {
  const { repo, role } = useApp();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const patients = useMemo(() => {
    let list = repo.listPatients();
    if (q) {
      const lower = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.fullName.toLowerCase().includes(lower) ||
          p.patientCode.toLowerCase().includes(lower),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    return list;
  }, [repo, q, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-sm text-slate-500">Searchable synthetic census ({patients.length} shown)</p>
        </div>
        {role === "administrator" && (
          <Link href="/patients/register" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
            Register patient
          </Link>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or ID"
            className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
            <option value="deceased">Deceased</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Age</th>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Admitted</th>
                <th className="px-3 py-2">Latest temp</th>
                <th className="px-3 py-2">Today temp</th>
                <th className="px-3 py-2">Today visit</th>
                <th className="px-3 py-2">Fever-free</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-sm text-slate-500">
                    No patients match your filters.
                  </td>
                </tr>
              ) : (
                patients.map((p) => <PatientRow key={p.id} patientId={p.id} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
