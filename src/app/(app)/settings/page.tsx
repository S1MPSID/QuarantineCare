"use client";

import { useState } from "react";
import { useApp } from "@/contexts/app-provider";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { repo, user, role, refresh, resetDemoData, isDemoMode } = useApp();
  const s = repo.getSettings();
  const [facilityName, setFacilityName] = useState(s.facilityName);
  const [capacity, setCapacity] = useState(s.maximumCapacity);
  const [threshold, setThreshold] = useState(s.feverThresholdCelsius);
  const [timezone, setTimezone] = useState(s.timezone);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (role !== "administrator") {
    return <p className="text-sm text-red-600">Settings are restricted to administrators.</p>;
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const result = repo.updateSettings(user!.id, role, {
      facilityName,
      maximumCapacity: capacity,
      feverThresholdCelsius: threshold,
      timezone,
    });
    setMessage(result.ok ? "Settings updated." : result.error.message);
    refresh();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      {isDemoMode && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Demo Mode: settings persist in this browser only. Fever threshold default 38.0°C is for demonstration — confirm your facility policy before production use.
        </p>
      )}

      <Card>
        <CardTitle className="mb-4">Facility configuration</CardTitle>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Facility name</label>
            <input value={facilityName} onChange={(e) => setFacilityName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Maximum capacity</label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Fever threshold (°C)</label>
            <input type="number" step="0.1" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Facility timezone</label>
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">Calendar-day rules use this timezone for daily uniqueness and fever-free streaks.</p>
          </div>
          {message && <p className="text-sm text-slate-600">{message}</p>}
          <Button type="submit">Save settings</Button>
        </form>
        <p className="mt-4 text-xs text-slate-400">Last updated {new Date(s.updatedAt).toLocaleString()}</p>
      </Card>

      <Card>
        <CardTitle className="mb-2">Role permissions</CardTitle>
        <ul className="list-disc pl-5 text-sm text-slate-600">
          <li>Nurse: temperatures, patient vitals</li>
          <li>Doctor: rounds, discharge clinical confirmation</li>
          <li>Administrator: admissions, admin discharge, outcomes, settings</li>
        </ul>
      </Card>

      <Card>
        <CardTitle className="mb-4">Reset demo data</CardTitle>
        <p className="mb-4 text-sm text-slate-600">Restores the initial synthetic dataset in this browser. Does not affect a real Supabase database.</p>
        {!confirmReset ? (
          <Button variant="danger" onClick={() => setConfirmReset(true)}>Reset demo data</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => { resetDemoData(); setConfirmReset(false); setMessage("Demo data reset."); }}>Confirm reset</Button>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
