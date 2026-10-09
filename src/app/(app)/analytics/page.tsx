"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/contexts/app-provider";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsPage() {
  const { repo } = useApp();
  const m = repo.getAnalytics();
  const metrics = repo.getDashboardMetrics();

  const chartData = [
    { name: "Temp completion", value: Math.round(metrics.tempCompletionRate) },
    { name: "Visit completion", value: Math.round(metrics.visitCompletionRate) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-slate-500">Calculated from synthetic resolved outcomes and active census</p>
      </div>

      {m.mortalityExceedsBenchmark && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <strong>Mortality benchmark alert:</strong> observed mortality {m.mortalityRate?.toFixed(1)}% exceeds the 15% assessment benchmark.
          Denominator: {m.resolvedOutcomes} resolved outcomes ({m.deaths} deaths, {m.completedDischarges} survivors). Small samples are not clinical predictions.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardTitle>Total admissions</CardTitle><p className="mt-2 text-2xl font-bold">{m.totalAdmissions}</p></Card>
        <Card><CardTitle>Active census</CardTitle><p className="mt-2 text-2xl font-bold">{m.activeCensus}</p></Card>
        <Card><CardTitle>Completed discharges</CardTitle><p className="mt-2 text-2xl font-bold">{m.completedDischarges}</p></Card>
        <Card><CardTitle>Recorded deaths</CardTitle><p className="mt-2 text-2xl font-bold">{m.deaths}</p></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Outcome rates</CardTitle>
          {m.resolvedOutcomes === 0 ? (
            <p className="text-sm text-slate-500">Insufficient data: no resolved outcomes yet (deaths + discharged survivors).</p>
          ) : (
            <div className="space-y-3 text-sm">
              <p>
                <Badge variant="danger">Mortality</Badge>{" "}
                {m.mortalityRate?.toFixed(1)}% ({m.deaths} / {m.resolvedOutcomes})
              </p>
              <p>
                <Badge variant="success">Survival</Badge>{" "}
                {m.survivalRate?.toFixed(1)}% ({m.completedDischarges} / {m.resolvedOutcomes})
              </p>
              <p className="text-xs text-slate-500">
                Mortality = deaths ÷ resolved outcomes. Survival = discharged survivors ÷ resolved outcomes. Patients still admitted are excluded.
              </p>
            </div>
          )}
        </Card>
        <Card>
          <CardTitle className="mb-4">Average length of stay</CardTitle>
          <p className="text-2xl font-bold">
            {m.avgLengthOfStayDays !== null ? `${m.avgLengthOfStayDays.toFixed(1)} days` : "—"}
          </p>
        </Card>
      </div>

      <Card>
        <CardTitle className="mb-4">Today&apos;s workflow completion (%)</CardTitle>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
