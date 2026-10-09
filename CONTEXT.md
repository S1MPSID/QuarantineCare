# QuarantineCare — Progress Context

_Last updated: 2026-10-09. Purpose: resume the Supabase wiring + Vercel deployment work in progress._

## 1. What the project is

A Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 web app for a virus quarantine facility (FactWise TPM assessment). Three roles (Nurse / Doctor / Administrator), demo mode with synthetic data in `localStorage`, full workflows: patient registration (74-bed cap), daily temperature recording, doctor rounds, 3-day fever-free discharge workflow, mortality/survival analytics vs 15% benchmark.

**Stack note:** original prompt suggested Vite + React Router, but the repo was an existing Next.js app, so everything was built on Next.js App Router (per AGENTS.md instruction to reuse repo framework).

## 2. Completed (working)

- [x] Full app shell: persistent sidebar, top bar (role/facility/date), mobile nav — `src/components/layout/app-shell.tsx`
- [x] All screens under `src/app/(app)/`: dashboard, patients (+register, +[id] detail), temperature, doctor-rounds, discharge, analytics, settings; login at `src/app/login/`; root redirect `src/app/page.tsx`
- [x] Domain layer (pure TS, no I/O): `src/domain/{types,dates,temperature,dashboard,analytics,permissions}.ts`
  - fever-free streak logic, facility-local date handling, mortality/survival math, role permission matrix
- [x] Repository layer: `src/services/demo-repository.ts` (all business validation: capacity 74, one temp/visit per patient-day, room uniqueness, discharge workflow gating, audit logs), `demo-storage.ts` (localStorage), `seed-data.ts` (synthetic dataset), `id.ts`
- [x] Role context / session: `src/contexts/app-provider.tsx` — demo role login (sessionStorage), `isDemoMode`, refresh, resetDemoData
- [x] Tests: `src/services/demo-repository.test.ts` (Vitest, 16 tests covering the required business rules), `vitest.config.ts`, `src/test/setup.ts` — `npm test` passes
- [x] Production build passes: `npm run build`
- [x] README.md (setup, demo flows, business rules, limitations), `.env.example`
- [x] SQL schema: `supabase/migrations/001_initial_schema.sql` (all 9 entities, unique indexes for one-routine-temp-per-day, one-visit-per-day, one-active-patient-per-room)

## 3. Supabase wiring — IN PROGRESS (interrupted mid-implementation)

Done so far:

- [x] Deps installed: `@supabase/supabase-js@^2.117.3`, `@supabase/ssr@^0.12.7`
- [x] `src/lib/env.ts` — `isSupabaseConfigured()`, `getSupabaseUrl()`, `getSupabaseAnonKey()`
- [x] `src/lib/supabase/client.ts` — browser client (`createBrowserClient`), throws if unconfigured
- [x] `src/lib/supabase/server.ts` — server client via `next/headers` cookies
- [x] `src/middleware.ts` — Supabase session refresh via `@supabase/ssr` (no-op when env vars absent, so demo mode unaffected)
- [x] `.env.example` with `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **NOT DONE:** `SupabaseRepository` — the data-access implementation. Must implement the same public interface as `DemoRepository` (read `demo-repository.ts` for the exact method surface) and map rows ↔ domain types from the SQL schema.
- [ ] **NOT DONE:** mode switch in `src/contexts/app-provider.tsx` — currently hardcodes `new DemoRepository()` and `isDemoMode: true`. Needs: if `isSupabaseConfigured()`, use SupabaseRepository + Supabase Auth session; else fall back to demo.
- [ ] **NOT DONE:** real Supabase Auth on `src/app/login/page.tsx` — `handleSupabaseLogin` currently just shows an error string. Should call `supabase.auth.signInWithPassword`, handle errors/loading, keep demo-access panel as fallback.
- [ ] **NOT DONE:** map Supabase `auth.users` → `users` table rows (role lookup after login); sign-out via `supabase.auth.signOut()`.
- [ ] **NOT DONE:** server-side authorization / RLS policies (schema has no RLS policies yet — only tables/constraints).
- [ ] **NOT DONE:** seeding the Supabase DB (SQL seed script for users/rooms/facility_settings; demo seed-data is TS-only for localStorage).
- [ ] Optional: server actions or API routes if writes should go through the server instead of client-side supabase-js.

### Architecture constraint

Keep data access behind the repository interface so the UI never imports supabase-js directly. UI components call `useApp().repo`; only `app-provider` decides demo vs supabase implementation.

## 4. Vercel deployment — NOT STARTED

- [ ] No `vercel.json` yet (default Next.js detection should suffice; add only if needed)
- [ ] No `.env.local` / `.env` present (fine for demo mode; needed for real Supabase)
- [ ] Deploy options: `vercel` CLI or GitHub integration; set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars in Vercel project settings
- [ ] Must verify production build again right before deploy: `npm run build` + `npm test`
- [ ] Do NOT claim a public URL until deploy actually succeeds
- [ ] Nothing committed yet: `git status` shows all work uncommitted (only commit is "Initial commit from Create Next App"). Consider committing before deploying.

## 5. Verification status

- `npm test` — passing (16 tests) as of last run
- `npm run build` — passing as of last run
- Dev server runs (port 3001 when 3000 busy)
- Supabase path: untested (no credentials; repository not implemented)
- Deployed: no

## 6. Recommended resume sequence

1. Read `src/services/demo-repository.ts` → extract its public interface into a `Repository` type (e.g., `src/services/repository.ts`) so both implementations satisfy it.
2. Implement `src/services/supabase-repository.ts` (row↔domain mapping, same validation where DB constraints don't cover it).
3. Update `app-provider.tsx`: choose repo by `isSupabaseConfigured()`; wire Supabase auth session/user/role; expose `mode`.
4. Update `login/page.tsx`: real `signInWithPassword` when configured; keep demo panel; show sign-out.
5. Add RLS policies + SQL seed for Supabase (or document SQL-editor steps in README).
6. Update README (Supabase setup section is currently marked "future step").
7. Run `npm test`, `npm run build`, fix errors.
8. Commit; deploy to Vercel with env vars; verify; report real URL or exact remaining blockers.

## 7. Key file map

```
src/
  app/(app)/            all authenticated screens
  app/login/            login + demo access
  app/providers.tsx     wraps AppProvider
  components/layout/    app-shell (sidebar/topbar)
  components/ui/        button, badge, card
  contexts/app-provider.tsx   session + repo injection (NEEDS supabase branch)
  domain/               pure business logic
  lib/env.ts            supabase env helpers
  lib/supabase/         client.ts, server.ts
  middleware.ts         supabase session refresh
  services/             demo-repository (interface to match), seed-data, tests
supabase/migrations/001_initial_schema.sql
```
