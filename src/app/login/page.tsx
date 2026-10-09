"use client";

import { useRouter } from "next/navigation";
import { Activity, Loader2, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/contexts/app-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UserRole } from "@/domain/types";

const roles: { role: UserRole; title: string; desc: string }[] = [
  { role: "nurse", title: "Nurse", desc: "Record temperatures and view patient vitals." },
  { role: "doctor", title: "Doctor", desc: "Daily rounds, clinical notes, discharge confirmation." },
  { role: "administrator", title: "Administrator", desc: "Admissions, discharge processing, analytics." },
];

export default function LoginPage() {
  const { loginDemo, loginSupabase, supabaseEnabled, authError, clearAuthError, user } =
    useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError("Enter both your email and password.");
      return;
    }
    setSubmitting(true);
    const success = await loginSupabase(email.trim(), password);
    setSubmitting(false);
    if (success) {
      router.push("/dashboard");
    }
  };

  const message = formError ?? authError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        <Card className="p-8">
          <div className="mb-6 flex items-center gap-3">
            <Activity className="h-9 w-9 text-teal-700" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">QuarantineCare</h1>
              <p className="text-sm text-slate-500">Patient & Facility Operations</p>
            </div>
          </div>
          <p className="mb-6 text-sm text-slate-600">
            {supabaseEnabled
              ? "Sign in with your facility account. Access is enforced by role-based database policies."
              : "Supabase Auth is not configured in this build, so sign-in is unavailable. Use Demo Access to explore QuarantineCare with synthetic data."}
          </p>
          <form onSubmit={handleSupabaseLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                disabled={!supabaseEnabled}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (message) {
                    setFormError(null);
                    clearAuthError();
                  }
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50 disabled:text-slate-400"
                placeholder="you@facility.org"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={!supabaseEnabled}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (message) {
                    setFormError(null);
                    clearAuthError();
                  }
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            {message && (
              <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!supabaseEnabled || submitting}>
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Card>

        <Card className="border-teal-100 bg-teal-50/40 p-8">
          <div className="mb-4 flex items-center gap-2 text-teal-900">
            <Shield className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Demo Access</h2>
          </div>
          <p className="mb-6 text-sm text-slate-600">
            {supabaseEnabled
              ? "Explore role-based workflows with browser-local synthetic data. Role selection is a UI demonstration only and is not a security boundary."
              : "Select a role to explore role-based workflows. Role selection is a UI demonstration only and is not a security boundary in demo mode."}
          </p>
          <div className="space-y-3">
            {roles.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => {
                  clearAuthError();
                  loginDemo(r.role);
                  router.push("/dashboard");
                }}
                className="flex w-full flex-col rounded-xl border border-white bg-white px-4 py-3 text-left shadow-sm transition hover:border-teal-200 hover:shadow focus:outline-none focus:ring-2 focus:ring-teal-200"
              >
                <span className="font-semibold text-slate-900">{r.title}</span>
                <span className="text-sm text-slate-500">{r.desc}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
