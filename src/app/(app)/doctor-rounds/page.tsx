"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/contexts/app-provider";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { todayFacilityDate } from "@/domain/dates";
import { hasRoutineReadingForDate, isFever } from "@/domain/temperature";
import { formatTemp } from "@/lib/utils";

export default function DoctorRoundsPage() {
  const { repo, user, role, refresh } = useApp();
  const settings = repo.getSettings();
  const today = todayFacilityDate(settings.timezone);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (role !== "doctor") {
    return <p className="text-sm text-red-600">Doctor rounds are available to doctors only.</p>;
  }

  const admitted = repo.listPatients().filter((p) => p.status === "admitted");

  const buckets = admitted.map((p) => {
    const readings = repo.getPatientReadings(p.id);
    const tr = hasRoutineReadingForDate(readings, today);
    const visit = repo.getPatientVisits(p.id).find((v) => v.facilityLocalDate === today);
    const fever = tr && isFever(tr.temperatureCelsius, settings.feverThresholdCelsius);
    const feverFree = repo.getFeverFree(p.id);
    return { p, tr, visit, fever, feverFree };
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setMessage(null);
    const result = repo.recordDoctorVisit(user!.id, role, {
      patientId: selectedId,
      clinicalNotes: notes,
      treatmentPlan: plan,
      followUpInstructions: followUp,
    });
    if (!result.ok) {
      setMessage(result.error.message);
      return;
    }
    if (result.data.temperatureMissingFlag) {
      setMessage("Visit saved. Warning: today's nursing temperature was still missing when documented.");
    } else {
      setMessage("Daily visit recorded successfully.");
    }
    setNotes("");
    setPlan("");
    setFollowUp("");
    refresh();
  };

  const selected = buckets.find((b) => b.p.id === selectedId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Doctor rounds</h1>
      <p className="text-sm text-slate-500">Review temperatures before documenting today&apos;s visit ({today}).</p>

      <div className="grid gap-4">
        {buckets.map(({ p, tr, visit, fever, feverFree }) => (
          <Card key={p.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">{p.fullName}</p>
              <p className="text-sm text-slate-500">{p.patientCode}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {!tr && <Badge variant="warning">Missing today&apos;s temperature</Badge>}
                {fever && <Badge variant="danger">Fever</Badge>}
                {visit && <Badge variant="success">Visit complete</Badge>}
                <Badge variant="info">{feverFree?.streak ?? 0} fever-free days</Badge>
              </div>
            </div>
            <div className="text-sm">
              <p>Latest: {tr ? formatTemp(tr.temperatureCelsius) : "No reading today"}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" onClick={() => setSelectedId(p.id)} disabled={!!visit}>
                  {visit ? "Reviewed" : "Document visit"}
                </Button>
                <Link href={`/patients/${p.id}`} className="text-sm text-teal-700 hover:underline self-center">
                  History
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selected && !selected.visit && (
        <Card>
          <CardTitle className="mb-2">Visit form — {selected.p.fullName}</CardTitle>
          {!selected.tr && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Today&apos;s temperature has not been recorded by nursing. You may document the visit, but the incomplete nursing task will be flagged.
            </p>
          )}
          <form onSubmit={submit} className="space-y-3 max-w-xl">
            <textarea required placeholder="Clinical notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3} />
            <input placeholder="Treatment plan update" value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder="Follow-up instructions" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <Button type="submit">Mark visit complete</Button>
          </form>
          {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
        </Card>
      )}
    </div>
  );
}
