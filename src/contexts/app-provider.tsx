"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User, UserRole } from "@/domain/types";
import { DemoRepository } from "@/services/demo-repository";
import { todayFacilityDate } from "@/domain/dates";

const SESSION_KEY = "quarantinecare-session";

interface Session {
  userId: string;
  mode: "demo" | "supabase";
}

interface AppContextValue {
  repo: DemoRepository;
  user: User | null;
  role: UserRole | null;
  isDemoMode: boolean;
  facilityDate: string;
  refresh: () => void;
  loginDemo: (role: UserRole) => void;
  logout: () => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [repo, setRepo] = useState<DemoRepository | null>(null);

  useEffect(() => {
    setRepo(new DemoRepository());
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw) as Session);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const refresh = useCallback(() => {
    setRepo(new DemoRepository());
    setTick((t) => t + 1);
  }, []);

  const user = useMemo(() => {
    if (!session || !repo) return null;
    return repo.getUsers().find((u) => u.id === session.userId) ?? null;
  }, [session, repo, tick]);

  const loginDemo = useCallback((role: UserRole) => {
    if (!repo) return;
    const match = repo.getUsers().find((u) => u.role === role);
    if (!match) return;
    const s: Session = { userId: match.id, mode: "demo" };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  }, [repo]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  const resetDemoData = useCallback(() => {
    if (!repo) return;
    repo.resetDemoData();
    refresh();
  }, [repo, refresh]);

  if (!repo) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading QuarantineCare…
      </div>
    );
  }

  const settings = repo.getSettings();
  const facilityDate = todayFacilityDate(settings.timezone);

  const value: AppContextValue = {
    repo,
    user,
    role: user?.role ?? null,
    isDemoMode: true,
    facilityDate,
    refresh,
    loginDemo,
    logout,
    resetDemoData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
