"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User, UserRole } from "@/domain/types";
import { DemoRepository } from "@/services/demo-repository";
import {
  SupabaseRepository,
  loadDatabaseFromSupabase,
  type SyncError,
} from "@/services/supabase-repository";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { todayFacilityDate } from "@/domain/dates";

const DEMO_SESSION_KEY = "quarantinecare-session";

interface DemoSession {
  userId: string;
  mode: "demo";
}

interface AppContextValue {
  repo: DemoRepository;
  user: User | null;
  role: UserRole | null;
  isDemoMode: boolean;
  supabaseEnabled: boolean;
  facilityDate: string;
  syncError: SyncError | null;
  authError: string | null;
  refresh: () => void;
  reload: () => Promise<void>;
  loginDemo: (role: UserRole) => void;
  loginSupabase: (email: string, password: string) => Promise<boolean>;
  clearAuthError: () => void;
  logout: () => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabaseEnabled = isSupabaseConfigured();
  const demoRepoRef = useRef<DemoRepository | null>(null);

  const [repo, setRepo] = useState<DemoRepository | null>(null);
  const [mode, setMode] = useState<"demo" | "supabase" | null>(null);
  const [session, setSession] = useState<{ userId: string } | null>(null);
  const [tick, setTick] = useState(0);
  const [syncError, setSyncError] = useState<SyncError | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const bindSupabaseRepo = useCallback((r: SupabaseRepository) => {
    r.subscribe(() => {
      setTick((t) => t + 1);
      setSyncError(r.getSyncError());
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (supabaseEnabled) {
        const client = getBrowserSupabase();
        if (client) {
          const { data } = await client.auth.getSession();
          if (data.session?.user && !cancelled) {
            try {
              const db = await loadDatabaseFromSupabase(client);
              if (cancelled) return;
              const r = new SupabaseRepository(client, db);
              bindSupabaseRepo(r);
              setRepo(r);
              setMode("supabase");
              setSession({ userId: data.session.user.id });
              return;
            } catch (error) {
              if (!cancelled) {
                setAuthError(
                  error instanceof Error
                    ? error.message
                    : "Failed to load facility data from Supabase.",
                );
              }
            }
          }
        }
      }

      if (cancelled) return;
      const demo = new DemoRepository();
      demoRepoRef.current = demo;
      const raw = sessionStorage.getItem(DEMO_SESSION_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as DemoSession;
          if (parsed.mode === "demo") setSession({ userId: parsed.userId });
        } catch {
          sessionStorage.removeItem(DEMO_SESSION_KEY);
        }
      }
      setRepo(demo);
      setMode("demo");
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseEnabled, bindSupabaseRepo]);

  const refresh = useCallback(() => {
    if (mode === "supabase") {
      setTick((t) => t + 1);
      return;
    }
    const demo = new DemoRepository();
    demoRepoRef.current = demo;
    setRepo(demo);
    setTick((t) => t + 1);
  }, [mode]);

  const reload = useCallback(async () => {
    if (mode === "supabase") {
      const client = getBrowserSupabase();
      if (client) {
        const db = await loadDatabaseFromSupabase(client);
        const r = new SupabaseRepository(client, db);
        bindSupabaseRepo(r);
        setRepo(r);
        setSyncError(null);
      }
    } else {
      const demo = new DemoRepository();
      demoRepoRef.current = demo;
      setRepo(demo);
    }
    setTick((t) => t + 1);
  }, [mode, bindSupabaseRepo]);

  const user = useMemo(() => {
    if (!session || !repo) return null;
    return repo.getUsers().find((u) => u.id === session.userId) ?? null;
  }, [session, repo]);

  const loginDemo = useCallback((role: UserRole) => {
    let demo = demoRepoRef.current;
    if (!demo) {
      demo = new DemoRepository();
      demoRepoRef.current = demo;
    }
    const match = demo.getUsers().find((u) => u.role === role);
    if (!match) return;
    const s: DemoSession = { userId: match.id, mode: "demo" };
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(s));
    setAuthError(null);
    setRepo(demo);
    setMode("demo");
    setSession({ userId: match.id });
  }, []);

  const loginSupabase = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const client = getBrowserSupabase();
      if (!client) {
        setAuthError("Supabase is not configured.");
        return false;
      }
      setAuthError(null);
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user) {
        setAuthError(error?.message ?? "Sign-in failed. Check your credentials.");
        return false;
      }
      try {
        const db = await loadDatabaseFromSupabase(client);
        const profile = db.users.find((u) => u.id === data.user.id);
        if (!profile) {
          await client.auth.signOut();
          setAuthError(
            "No facility role is assigned to this account. Ask an administrator to provision your profile.",
          );
          return false;
        }
        const r = new SupabaseRepository(client, db);
        bindSupabaseRepo(r);
        sessionStorage.removeItem(DEMO_SESSION_KEY);
        setRepo(r);
        setMode("supabase");
        setSession({ userId: data.user.id });
        setSyncError(null);
        return true;
      } catch (err) {
        setAuthError(
          err instanceof Error ? err.message : "Failed to load facility data.",
        );
        return false;
      }
    },
    [bindSupabaseRepo],
  );

  const logout = useCallback(() => {
    const client = getBrowserSupabase();
    if (mode === "supabase" && client) {
      void client.auth.signOut();
    }
    sessionStorage.removeItem(DEMO_SESSION_KEY);
    setSession(null);
    const demo = demoRepoRef.current ?? new DemoRepository();
    demoRepoRef.current = demo;
    setRepo(demo);
    setMode("demo");
    setSyncError(null);
  }, [mode]);

  const resetDemoData = useCallback(() => {
    const demo = demoRepoRef.current ?? new DemoRepository();
    demoRepoRef.current = demo;
    demo.resetDemoData();
    setRepo(demo);
    setTick((t) => t + 1);
  }, []);

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
    isDemoMode: mode !== "supabase",
    supabaseEnabled,
    facilityDate,
    syncError,
    authError,
    refresh,
    reload,
    loginDemo,
    loginSupabase,
    clearAuthError: () => setAuthError(null),
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
