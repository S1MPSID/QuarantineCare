"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/contexts/app-provider";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

export default function RegisterPatientPage() {
  const { repo, user, role, refresh } = useApp();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState(40);
  const [roomId, setRoomId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const rooms = repo.getAvailableRooms();

  if (role !== "administrator") {
    return <p className="text-sm text-red-600">Only administrators can register patients.</p>;
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = repo.registerPatient(user!.id, role, {
      fullName,
      age,
      roomId,
      adminNotes: notes,
    });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSuccess(`Patient ${result.data.patientCode} registered successfully.`);
    refresh();
    setTimeout(() => router.push(`/patients/${result.data.id}`), 800);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Patient registration</h1>
      <Card>
        <CardTitle className="mb-4">New admission (synthetic)</CardTitle>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Age</label>
            <input required type="number" min={1} max={120} value={age} onChange={(e) => setAge(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Available room</label>
            <select required value={roomId} onChange={(e) => setRoomId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Select room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>Room {r.roomNumber}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">{rooms.length} rooms available · capacity {repo.getSettings().maximumCapacity}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Administrative notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          {success && <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">{success}</p>}
          <Button type="submit">Confirm registration</Button>
        </form>
      </Card>
    </div>
  );
}
