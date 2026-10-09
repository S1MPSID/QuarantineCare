# QuarantineCare — Progress Context

_Last updated: 2026-10-09. Supabase integration implemented; deployment to Vercel is the remaining step._

## 1. What the project is

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 web app for a virus quarantine facility (FactWise TPM assessment). Three roles (Nurse / Doctor / Administrator), 74-bed cap, daily temperature + doctor-visit workflows, 3-day fever-free discharge process, mortality/survival analytics vs. 15% benchmark. Runs in **Demo Mode** out of the box and optionally against **Supabase** (Auth + Postgres + RLS).

## 2. Completed

- [x] Full app: dashboard, patients (+register, +detail), temperature, doctor-rounds, discharge, analytics, settings; login; responsive shell — under `src/app/(app)/`, `src/components/`
- [x] Domain layer (pure): `src/domain/{types,dates,temperature,dashboard,analytics,permissions}.ts`
- [x] Demo Mode: `DemoRepository` + `demo-storage.ts` (localStorage) + `seed-data.ts`
- [x] Tests: `demo-repository.test.ts` (16 Vitest tests) — passing
- [x] Lint clean; production build passes
- [x] README (detailed), `startup.md`, `.env.example`, `CONTEXT.md`

## 3. Supabase integration — implemented

- [x] `src/lib/env.ts`, `src/lib/supabase/{client,server}.ts`, `src/proxy.ts` (Next 16 session refresh)
- [x] `src/services/mappers.ts` — row ↔ domain conversion (all 9 tables)
- [x] `src/services/supabase-repository.ts` — `loadDatabaseFromSupabase()`, `SupabaseRepository extends DemoRepository` with serialized diff-and-write sync + `syncError`/`subscribe`
- [x] `src/contexts/app-provider.tsx` — dual mode: Supabase session load + role lookup, `loginSupabase`, `loginDemo`, `logout`, `reload`, `refresh`, `syncError`
- [x] `src/app/login/page.tsx` — real `signInWithPassword` + always-available Demo Access
- [x] `src/components/layout/app-shell.tsx` — `Connected`/`Demo Mode` badge + sync-error banner
- [x] SQL: `002_seed_base.sql` (FK + `handle_new_user` trigger + 74 rooms + settings), `003_seed_demo.sql` (synthetic dataset), `004_rls.sql` (RLS + role policies)
- [x] `.env.local` points at the project (gitignored)

### Design
UI stays synchronous: the dataset is loaded into memory on sign-in and all existing `DemoRepository` validation/reads are reused. Writes update memory optimistically and mirror to Postgres via a background diff/upsert. DB unique indexes + RLS policies are the real enforcement boundary; failures surface a banner. Realtime multi-tab sync is **not** wired (optional P1).

## 4. Known limitations

- Optimistic write-through (not awaited per action); failed writes reconcile on refresh.
- No Supabase Realtime; concurrent tabs can go stale until refresh.
- Route gating is client-side (AppShell redirect) to support dual-mode; data security is enforced by RLS.
- Supabase demo seed = 20 admitted + 4 discharged + 1 deceased (Demo Mode seeds ~72).

## 5. Remaining: deploy to Vercel

Not started — no Vercel credentials/CLI session available.
1. Commit + push (done via git).
2. Import repo at vercel.com/new (Next.js auto-detected) or `npx vercel`.
3. Add env vars `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project settings (only needed for the Supabase path; Demo Mode needs none).
4. Deploy, verify sign-in + a workflow, report the real URL (do not claim a URL until it succeeds).

## 6. Manual Supabase steps (owner)

1. SQL Editor: run `001` → `002`.
2. Authentication → Users: create `nurse@`, `doctor@`, `admin@` with metadata `{"role":"...","full_name":"..."}` (confirmed).
3. SQL Editor: run `003` → `004`.
4. Ensure `.env.local` has the URL + publishable key.

## 7. Key file map

```
src/
  app/(app)/            authenticated screens; app/login/; app/page.tsx -> /login
  components/layout/    app-shell (sidebar/topbar/badge/sync banner)
  contexts/app-provider.tsx    dual-mode session + repo injection
  domain/               pure business logic
  lib/env.ts, lib/supabase/{client,server}.ts
  proxy.ts              Supabase session refresh (Next 16 proxy convention)
  services/             demo-repository, supabase-repository, mappers, seed-data, tests
supabase/migrations/    001 schema, 002 base seed, 003 demo seed, 004 RLS
```
