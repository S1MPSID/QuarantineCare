"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Stethoscope,
  Thermometer,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/contexts/app-provider";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/domain/types";

const navItems: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["nurse", "doctor", "administrator"] },
  { href: "/patients", label: "Patients", icon: Users, roles: ["nurse", "doctor", "administrator"] },
  { href: "/temperature", label: "Temperature Tracking", icon: Thermometer, roles: ["nurse"] },
  { href: "/doctor-rounds", label: "Doctor Rounds", icon: Stethoscope, roles: ["doctor"] },
  { href: "/discharge", label: "Discharge Management", icon: ClipboardList, roles: ["doctor", "administrator"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["doctor", "administrator"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["administrator"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { repo, user, role, isDemoMode, facilityDate, logout, syncError } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const settings = repo.getSettings();

  useEffect(() => {
    if (!user || !role) router.replace("/login");
  }, [user, role, router]);

  if (!user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Redirecting to sign in…
      </div>
    );
  }

  const visibleNav = navItems.filter((n) => n.roles.includes(role));

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-b border-slate-100 px-5 py-5">
          <div className="flex items-center gap-2">
            <Activity className="h-7 w-7 text-teal-700" />
            <div>
              <p className="text-base font-bold text-slate-900">QuarantineCare</p>
              <p className="text-xs text-slate-500">Patient & Facility Operations</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {visibleNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-teal-50 text-teal-900"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-4 text-xs text-slate-500">
          Synthetic demo data only. Not for clinical use.
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">{settings.facilityName}</p>
              <p className="text-xs text-slate-500">Facility date: {facilityDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isDemoMode ? (
              <Badge variant="warning">Demo Mode</Badge>
            ) : (
              <Badge variant="success">Connected</Badge>
            )}
            <div className="text-right">
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-xs capitalize text-slate-500">{role}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        {syncError && (
          <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 lg:px-8">
            <strong className="font-semibold">Change not saved to Supabase:</strong>{" "}
            {syncError.message}
          </div>
        )}
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
