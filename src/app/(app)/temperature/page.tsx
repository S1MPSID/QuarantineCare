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

export default function TemperaturePage() {
  const { repo, user, role, refresh } = useApp();
  const settings = repo.getSettings();
  const today = todayFacilityDate(settings.timezone);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [temp, setTemp] = useState("37.0");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (role !== "nurse") {
    return <p className="text-sm text-red-600">Temperature recording is available to nurses only.</p>;
  }

  const admitted = repo.listPatients().filter((p) => p.status === "admitted");
  const pending = admitted.filter((p) => !hasRoutineReadingForDate(repo.getPatientReadings(p.id), today));
  const complete = admitted.filter((p) => hasRoutineReadingForDate(repo.getPatientReadings(p.id), today));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setMessage(null);
    const result = repo.recordTemperature(user!.id, role, {
      patientId: selectedId,
      temperatureCelsius: Number(temp),
      notes,
    });
    if (!result.ok) {
      let text = result.error.message;
      if (result.error.code === "DUPLICATE_READING" && result.error.details) {
        text += ` Existing: ${formatTemp(result.error.details.temperature as number)}.`;
      }
      setMessage({ type: "err", text });
      return;
    }
    const fever = isFever(result.data.temperatureCelsius, settings.feverThresholdCelsius);
    setMessage({
      type: "ok",
      text: fever
        ? `Recorded ${formatTemp(result.data.temperatureCelsius)} — exceeds ${settings.feverThresholdCelsius}°C threshold. Flagged for clinical review.`
        : `Temperature recorded successfully (${formatTemp(result.data.temperatureCelsius)}).`,
    });
    setNotes("");
    refresh();
  };

  const selected = selectedId ? repo.getPatient(selectedId) : null;
  const selectedReading = selected
    ? hasRoutineReadingForDate(repo.getPatientReadings(selected.id), today)
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Temperature tracking</h1>
        <p className="text-sm text-slate-500">Facility date {today} · one routine reading per patient per calendar day</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-3">Pending today ({pending.length})</CardTitle>
          <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {pending.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${selectedId === p.id ? "border-teal-500 bg-teal-50" : "border-slate-100"}`}
                >
                  <span>{p.fullName}</span>
                  <Badge variant="warning">Pending</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle className="mb-3">Completed today ({complete.length})</CardTitle>
          <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {complete.map((p) => {
              const r = hasRoutineReadingForDate(repo.getPatientReadings(p.id), today)!;
              return (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span>{p.fullName}</span>
                  <Badge variant={isFever(r.temperatureCelsius, settings.feverThresholdCelsius) ? "danger" : "success"}>
                    {formatTemp(r.temperatureCelsius)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle className="mb-4">Record temperature</CardTitle>
        {selected ? (
          <form onSubmit={submit} className="space-y-4 max-w-md">
            <p className="text-sm text-slate-600">{selected.fullName} ({selected.patientCode})</p>
            {selectedReading && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Already recorded today: {formatTemp(selectedReading.temperatureCelsius)}. Use correction workflow on patient profile if permitted.
              </p>
            )}
            <div>
              <label className="text-sm font-medium">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                required
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Optional note</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} />
            </div>
            <Button type="submit" disabled={!!selectedReading}>Save reading</Button>
            <Link href={`/patients/${selected.id}`} className="ml-3 text-sm text-teal-700 hover:underline">View history</Link>
          </form>
        ) : (
          <p className="text-sm text-slate-500">Select a patient from the pending list.</p>
        )}
        {message && (
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${message.type === "ok" ? "bg-teal-50 text-teal-900" : "bg-red-50 text-red-800"}`}>
            {message.text}
          </p>
        )}
      </Card>
    </div>
  );
}
