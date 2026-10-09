"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useApp } from "@/contexts/app-provider";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { todayFacilityDate } from "@/domain/dates";
import { hasRoutineReadingForDate, isFever } from "@/domain/temperature";

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

function ProgressBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { repo, role, refresh } = useApp();
  const metrics = repo.getDashboardMetrics();
  const settings = repo.getSettings();
  const today = todayFacilityDate(settings.timezone);
  const admitted = repo.listPatients().filter((p) => p.status === "admitted");

  const exceptions = admitted
    .map((p) => {
      const readings = repo.getPatientReadings(p.id);
      const tr = hasRoutineReadingForDate(readings, today);
      const fever =
        tr && isFever(tr.temperatureCelsius, settings.feverThresholdCelsius);
      const visit = repo.getPatientVisits(p.id).some((v) => v.facilityLocalDate === today);
      if (fever) return { p, type: "fever", msg: "Elevated temperature recorded today" };
      if (!tr) return { p, type: "temp", msg: "Temperature measurement pending today" };
      if (!visit) return { p, type: "visit", msg: "Doctor visit pending today" };
      return null;
    })
    .filter(Boolean)
    .slice(0, 8);

  const quick =
    role === "nurse"
      ? { href: "/temperature", label: "Record temperatures" }
      : role === "doctor"
        ? { href: "/doctor-rounds", label: "Start doctor rounds" }
        : { href: "/patients/register", label: "Register patient" };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Overview</h1>
          <p className="text-sm text-slate-500">Live metrics from synthetic demo census</p>
        </div>
        <Button variant="secondary" onClick={refresh}>Refresh data</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Admitted patients" value={metrics.totalAdmitted} />
        <Kpi label="Bed occupancy" value={`${metrics.occupiedBeds} / ${metrics.maxCapacity}`} sub={`${metrics.availableBeds} available`} />
        <Kpi label="Temp completed today" value={metrics.tempCompletedToday} sub={`${metrics.tempPendingToday} pending`} />
        <Kpi label="Doctor visits today" value={metrics.visitsCompletedToday} sub={`${metrics.visitsPendingToday} pending`} />
        <Kpi label="Discharge candidates" value={metrics.dischargeCandidates} />
        <Kpi label="Awaiting admin discharge" value={metrics.dischargeAwaitingAdmin} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Daily workflow completion</CardTitle>
          <div className="space-y-4">
            <ProgressBar label="Temperature measurements" pct={metrics.tempCompletionRate} />
            <ProgressBar label="Doctor visits" pct={metrics.visitCompletionRate} />
          </div>
        </Card>
        <Card>
          <CardTitle className="mb-4">Quick action</CardTitle>
          <p className="mb-4 text-sm text-slate-600">Role-specific shortcut for today&apos;s work.</p>
          <Link href={quick.href}>
            <Button className="w-full sm:w-auto">
              {quick.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </div>

      <Card>
        <CardTitle className="mb-4">Urgent operational exceptions</CardTitle>
        {exceptions.length === 0 ? (
          <p className="text-sm text-slate-500">No exceptions for admitted patients today.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {exceptions.map((ex) => (
              <li key={ex!.p.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={ex!.type === "fever" ? "h-4 w-4 text-red-600" : "h-4 w-4 text-amber-600"} />
                  <div>
                    <p className="font-medium text-slate-900">{ex!.p.fullName}</p>
                    <p className="text-sm text-slate-500">{ex!.msg}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ex!.type === "fever" ? "danger" : "warning"}>{ex!.p.patientCode}</Badge>
                  <Link href={`/patients/${ex!.p.id}`} className="text-sm font-medium text-teal-700 hover:underline">
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle className="mb-4">Recent activity</CardTitle>
        <ul className="space-y-2 text-sm text-slate-600">
          {repo.getAuditLogs(6).map((log) => (
            <li key={log.id} className="flex justify-between gap-4 border-b border-slate-50 pb-2">
              <span>{log.action} · {log.entityType}</span>
              <span className="shrink-0 text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
