"use client";

import { useState } from "react";
import { useApp } from "@/contexts/app-provider";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DischargePage() {
  const { repo, user, role, refresh } = useApp();
  const [message, setMessage] = useState<string | null>(null);

  const admitted = repo.listPatients().filter((p) => p.status === "admitted");
  const queue = repo.getDischargeQueue();

  const candidates = admitted
    .map((p) => ({ p, ff: repo.getFeverFree(p.id) }))
    .filter(({ ff, p }) => {
      const open = queue.some(
        (r) =>
          r.patientId === p.id &&
          (r.status === "awaiting_administration" || r.status === "completed"),
      );
      return ff?.eligibleForDischarge && !open;
    });

  const confirm = (patientId: string) => {
    const result = repo.confirmDischarge(user!.id, role!, patientId);
    setMessage(result.ok ? "Clinical discharge confirmed. Sent to administration." : result.error.message);
    refresh();
  };

  const complete = (requestId: string) => {
    const result = repo.completeAdministrativeDischarge(user!.id, role!, requestId);
    setMessage(result.ok ? "Administrative discharge completed. Bed released." : result.error.message);
    refresh();
  };

  const recordDeath = (patientId: string) => {
    const result = repo.recordDeath(
      user!.id,
      role!,
      patientId,
      "Synthetic outcome recorded by administrator (demo).",
    );
    setMessage(result.ok ? "Death outcome recorded. Bed released." : result.error.message);
    refresh();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Discharge management</h1>
      <p className="text-sm text-slate-500">
        Three consecutive calendar days with recorded sub-threshold temperatures are required before clinical confirmation.
      </p>
      {message && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm">{message}</p>}

      {role === "doctor" && (
        <Card>
          <CardTitle className="mb-4">Discharge candidates (clinical review)</CardTitle>
          {candidates.length === 0 ? (
            <p className="text-sm text-slate-500">No patients currently meet eligibility without an open request.</p>
          ) : (
            <ul className="space-y-3">
              {candidates.map(({ p, ff }) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                  <div>
                    <p className="font-medium">{p.fullName}</p>
                    <p className="text-sm text-slate-500">{ff?.explanation}</p>
                    <p className="mt-1 text-xs text-slate-400">Qualifying dates: {ff?.qualifyingDates.slice(-3).join(", ")}</p>
                  </div>
                  <Button onClick={() => confirm(p.id)}>Confirm clinical eligibility</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card>
        <CardTitle className="mb-4">Discharge queue</CardTitle>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-4">Patient</th>
                <th className="py-2 pr-4">Fever-free dates</th>
                <th className="py-2 pr-4">Doctor confirmed</th>
                <th className="py-2 pr-4">Admin status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((r) => {
                const p = repo.getPatient(r.patientId);
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="py-3 pr-4">{p?.fullName}</td>
                    <td className="py-3 pr-4">{r.feverFreeDates.join(", ") || "—"}</td>
                    <td className="py-3 pr-4">{r.eligibilityConfirmedAt ? new Date(r.eligibilityConfirmedAt).toLocaleString() : "—"}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={r.status === "completed" ? "success" : "warning"}>{r.status}</Badge>
                    </td>
                    <td className="py-3">
                      {role === "administrator" && r.status === "awaiting_administration" && (
                        <Button variant="secondary" onClick={() => complete(r.id)}>Complete discharge</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {role === "administrator" && (
        <Card>
          <CardTitle className="mb-2">Record death outcome</CardTitle>
          <p className="mb-3 text-sm text-slate-500">
            Deaths are recorded separately from routine discharge and included in mortality analytics.
          </p>
          <ul className="space-y-2 text-sm">
            {admitted.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                <span>{p.fullName}</span>
                <Button variant="danger" onClick={() => recordDeath(p.id)}>Record verified death</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
