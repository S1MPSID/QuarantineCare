# QuarantineCare

**Patient & Facility Operations** — a professional, role-based operations platform for a virus quarantine and treatment facility.

Built for the **FactWise Technical Product Manager** assessment. QuarantineCare centralizes patient records, enforces daily clinical workflows (temperature measurement + doctor visit), streamlines the multi-step discharge process, and calculates operational and outcome analytics — including mortality vs. a 15% benchmark.

> ⚠️ **Assessment prototype using synthetic data only.** This is not a clinically validated, HIPAA-compliant, or production-grade medical system. The default fever threshold (38.0°C) is a demonstration default, not medical advice.

---

## Table of Contents

- [Highlights](#highlights)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Demo Access & Walkthrough](#demo-access--walkthrough)
- [Screens](#screens)
- [User Roles & Permissions](#user-roles--permissions)
- [Business Rules](#business-rules)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Supabase Setup (Optional)](#supabase-setup-optional)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)
- [Further Reading](#further-reading)

---

## Highlights

- **Three roles, three experiences** — Nurse, Doctor, and Administrator each get a tailored navigation menu, dashboard, and action set. Unauthorized actions are blocked at the service layer, not just hidden in the UI.
- **Real calculations, no hardcoded metrics** — occupancy, daily task completion, fever-free streaks, discharge eligibility, mortality and survival rates are all computed from the underlying dataset.
- **Demo Mode** — runs entirely in the browser with realistic synthetic data persisted to `localStorage`. No backend, API keys, or network calls required. Clearly badged in the UI.
- **Repository/data-service layer** — all reads and writes go through `DemoRepository`, so a Supabase implementation can be swapped in without touching any UI code.
- **Daily workflow enforcement** — one temperature and one doctor visit per patient per facility-local calendar day; duplicates are rejected with a link to the existing record, and corrections preserve an audit trail.
- **Discharge workflow** — 3 consecutive fever-free calendar days → doctor confirmation → administrative processing → bed released. Deaths are recorded as outcomes, never as ordinary discharges.
- **Analytics with transparent math** — every rate shows its numerator, denominator, and reporting period; a prominent warning appears when mortality exceeds the 15% benchmark; zero-denominator states show "insufficient data" instead of dividing by zero.
- **Tested** — Vitest suite covering the critical business rules (capacity limits, duplicate readings, streak logic, permission enforcement, mortality math, audit retention).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16** (App Router) + **React 19** |
| Language | **TypeScript** (typed domain models throughout) |
| Styling | **Tailwind CSS 4** |
| UI components | Custom accessible components (`src/components/ui`) |
| Icons | **Lucide React** |
| Charts | **Recharts** |
| Dates | **date-fns** + facility-timezone-aware helpers (`src/domain/dates.ts`) |
| Forms | Controlled forms + **Zod** (installed) |
| Backend (optional) | **Supabase** (PostgreSQL + Auth) — schema provided; wiring in progress |
| Persistence (default) | Browser `localStorage` via Demo Mode |
| Testing | **Vitest** + **Testing Library** |
| Deployment | **Vercel** (frontend), **Supabase** (optional backend) |

> The original assessment brief suggested Vite + React Router; this repository already used Next.js 16, so the app was built on the existing framework (per repo conventions) with identical goals and features.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Open **http://localhost:3000** (if busy, Next.js picks the next free port — check the terminal).

On the login page, use the **Demo Access** panel to enter as **Nurse**, **Doctor**, or **Administrator**. No configuration needed — Demo Mode works out of the box.

```bash
npm test          # run the Vitest business-rule suite
npm run lint      # ESLint
npm run build     # production build
npm start         # serve the production build
```

See [`startup.md`](./startup.md) for a fuller getting-started guide with troubleshooting.

---

## Demo Access & Walkthrough

Demo mode stores data in your browser's `localStorage` (per origin). The header shows a **Demo Mode** badge. Role selection in demo mode demonstrates the UI and is **not** a security boundary.

### Suggested demo path

| Step | Role | Action |
|------|------|--------|
| 1 | **Nurse** | *Temperature Tracking* → record a temperature for a pending patient (e.g. Mohammed Ali). Note the fever alert if the value exceeds 38.0°C. |
| 2 | **Doctor** | *Doctor Rounds* → record today's visit. If the nurse hasn't recorded a temperature, you'll see a prominent warning — the visit can still be documented but the incomplete nursing task stays flagged. |
| 3 | **Doctor** | *Discharge Management* → review a patient with 3 qualifying fever-free days (e.g. Sneha Patel) and **confirm clinical eligibility**. |
| 4 | **Administrator** | *Discharge Management* → **complete the administrative discharge**; watch the bed become available on the Dashboard. |
| 5 | **Administrator** | *Patients → Register* a new patient into a free room (capacity cap = 74). |
| 6 | **Any** | *Analytics* → inspect mortality/survival rates with numerator/denominator vs. the 15% benchmark. |
| 7 | **Administrator** | *Settings → Reset demo data* to restore the original synthetic dataset at any time. |

### Seed dataset

The demo environment ships with a deliberately varied synthetic dataset:

- ~70 admitted patients plus discharged and deceased examples (facility capacity: **74**)
- Patients with pending and completed temperatures/visits today
- Patients with 0, 1, 2, and 3+ qualifying fever-free days
- Patients with missing observations, recorded fever, and a reset streak
- A discharge candidate awaiting doctor review, a doctor-confirmed request awaiting administration, and at least one completed discharge
- Recorded deaths and recovered outcomes so analytics are demonstrable
- Available and occupied rooms

All names and values are **synthetic** and clearly labeled as such.

---

## Screens

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 1 | **Login / Demo Entry** | `/login` | Branding, sign-in form (Supabase Auth when configured), and a clearly separated Demo Access role selector. |
| 2 | **Dashboard** | `/dashboard` | Role-aware KPI cards (census, occupancy ×74, today's temperature/visit completion, discharge candidates, pending requests), workflow completion bars, urgent exceptions, recent activity, role-specific quick actions. All values computed from data. |
| 3 | **Patient List** | `/patients` | Searchable, filterable, sortable table: ID, name, age, room, admission date, latest temperature, today's temp/visit status, fever-free streak, status, actions. Pagination + empty states + responsive layout. |
| 4 | **Patient Registration** | `/patients/register` | Auto-generated unique patient ID, validation, room assignment (no double-booking), 74-bed capacity rejection, duplicate-submission protection, confirmation feedback. |
| 5 | **Patient Detail** | `/patients/[id]` | Demographics, room, status, temperature history + timeline, doctor-visit history, treatment notes (authorized roles only), fever-free calculation with explanation, discharge eligibility rationale, audit/activity history. |
| 6 | **Temperature Tracking** | `/temperature` | Nurse workspace: pending vs. completed today, search/room filters, entry form (°C, auto date/time, nurse identity, optional note). Duplicate rejection with link to existing reading, correction workflow with audit retention, fever alert on threshold exceed, rejection for non-admitted patients. |
| 7 | **Doctor Rounds** | `/doctor-rounds` | Daily queue split by awaiting review / temperature completed / missing / already reviewed; high-priority (fever) flags; latest temperature + trend + streak; visit form with clinical notes, treatment plan, follow-ups; missing-temperature warning; duplicate-visit prevention. |
| 8 | **Discharge Management** | `/discharge` | Queue with eligibility status, qualifying dates, doctor confirmation, admin processing. Full workflow: candidate → doctor confirmation → request → admin completion → status change → bed release → dashboard/analytics update. No automatic discharge; deaths excluded from normal workflow. |
| 9 | **Analytics** | `/analytics` | Date-filtered charts and metrics: admissions, discharges, census, deaths, resolved outcomes, mortality/survival (with numerator/denominator), daily completion rates, average length of stay, discharge processing time. Insufficient-data and >15% benchmark warning states. |
| 10 | **Settings** | `/settings` | Facility name, max capacity (74), timezone, fever threshold (38.0°C demo default), fever-free rule explanation, role/permission overview, demo-mode indicator, **Reset Demo Data**. Sensitive settings are role-protected with validation. |

---

## User Roles & Permissions

### Nurse
✅ View admitted patients & rooms · view daily temperature tasks · filter by pending/completed · open patient profiles · record temperature (°C) with optional observation · auto-captured date/time & nurse identity · view temperature history · correct erroneous entries via an audited correction workflow (when policy permits)

❌ Record doctor visits · change treatment decisions · approve/complete discharge · register or assign patients (unless authorized)

### Doctor
✅ Today's round queue (including who has/hasn't been measured) · review current & historical temperatures · record daily visit + clinical notes · record treatment decisions/plan updates · identify missing or elevated readings · view discharge candidates · confirm clinical eligibility after verifying fever-free days · send discharge requests to administration · view clinical outcome metrics

❌ Bypass discharge conditions without an authorized, audited override · complete administrative discharge (by default) · delete audit history

### Administrator
✅ Facility-wide metrics · register patients (unique IDs, available rooms) · manage admissions · view daily completion status · view and process discharge requests · complete administrative discharge after doctor confirmation · record verified death outcomes · manage users/roles (when backend permits) · configure facility settings (threshold, capacity) with authorization

❌ Record clinical temperatures as a nurse · write or modify doctor notes · independently authorize clinical discharge

> **Demo mode caveat:** In Demo Mode, role checks are enforced in the client service layer for demonstration purposes. For a real deployment, permissions must be enforced server-side via Supabase Auth identities, database policies (RLS), and role validation — never by hiding frontend buttons alone.

---

## Business Rules

1. **Daily temperature** — each admitted patient must have exactly one recorded temperature per facility-local calendar day. A second routine submission for the same patient/day is rejected and links to the existing reading; corrections go through an explicit audit-preserving workflow.
2. **Daily doctor visit** — exactly one documented visit per patient per calendar day; duplicates blocked by default.
3. **Reading provenance** — every temperature is linked to patient, date, time, and recording nurse.
4. **Review before visiting** — doctors see full temperature history and today's status before recording a visit.
5. **Fever threshold** — configurable; **38.0°C is an explicitly documented demonstration default**, not a medically validated universal threshold. Authorized users must confirm the facility's actual policy in Settings.
6. **Fever-free day** — a calendar day qualifies only if a temperature observation exists **and** is below the threshold. **Missing measurements never count as fever-free.** A fever resets the streak; a gap breaks it.
7. **Discharge eligibility** — 3 **complete consecutive** qualifying calendar days (not merely 72 elapsed hours). The system shows which dates qualify and why.
8. **Discharge stages** — eligibility (system) → doctor confirmation → administrative processing → completed discharge. Only completed discharges release beds; no stage is inferred or skipped; unreviewed ≠ approved.
9. **Capacity** — never more than **74** active patients; admission rejected with a clear message when full; room cannot host two active patients.
10. **Deaths** — recorded through the outcome workflow (not ordinary discharge); the room is released and the death is excluded from recovery counts.
11. **Mortality rate** = deaths ÷ resolved outcomes × 100. **Survival rate** = survivors ÷ resolved outcomes × 100, where resolved outcomes = deaths + recovered/discharged patients. Active patients are excluded from the denominator. Never computed as `100% − mortality`.
12. **Benchmark flagging** — mortality >15% triggers a prominent warning that always shows the denominator and sample size; a zero denominator shows an insufficient-data state. The 15% figure is the expected benchmark from the problem statement, not a validated prediction for small samples.
13. **No clinical fabrication** — the app never invents diagnoses, prescribes treatment, or auto-authorizes discharge.
14. **Timezone** — all daily uniqueness and eligibility calculations use the configured facility-local timezone (default `Asia/Kolkata`).
15. **Audit** — records are never silently overwritten and audit history is never deleted; corrections retain previous values.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  UI (Next.js App Router pages + components)             │
│  src/app/(app)/* , src/components/*                     │
└───────────────┬─────────────────────────────────────────┘
                │ useApp().repo  (no direct data imports)
┌───────────────▼─────────────────────────────────────────┐
│  App Context (src/contexts/app-provider.tsx)            │
│  session, role, facility date, repo injection           │
└───────────────┬─────────────────────────────────────────┘
                │ Repository interface
┌───────────────▼───────────────────────┐  ┌──────────────┐
│  DemoRepository (src/services/)       │  │  Domain      │
│  business validation + localStorage   │──│  src/domain/ │
│  [SupabaseRepository: planned]        │  │  pure logic  │
└───────────────────────────────────────┘  └──────────────┘
```

- **Domain layer** (`src/domain/`) — pure, framework-free business logic: streak calculation, dashboard metrics, analytics formulas, permissions, timezone-aware dates. Fully unit-testable.
- **Repository layer** (`src/services/`) — the single data-access boundary. `DemoRepository` enforces validation server-style (duplicate prevention, capacity, permissions) before writing to `localStorage`. A future `SupabaseRepository` satisfies the same interface, so **no UI changes** are needed to go live.
- **Presentation layer** — pages and reusable components; never contain business formulas.

---

## Project Structure

```
factwise/
├── src/
│   ├── app/
│   │   ├── (app)/                  # authenticated screens
│   │   │   ├── dashboard/
│   │   │   ├── patients/           # list, register/, [id]/
│   │   │   ├── temperature/
│   │   │   ├── doctor-rounds/
│   │   │   ├── discharge/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── login/                  # login + demo access
│   │   ├── providers.tsx           # AppProvider wrapper
│   │   ├── layout.tsx / page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/app-shell.tsx    # sidebar + topbar + mobile nav
│   │   └── ui/                     # button, badge, card
│   ├── contexts/app-provider.tsx   # session + repository injection
│   ├── domain/                     # pure business logic
│   │   ├── types.ts                # typed domain models
│   │   ├── dates.ts                # facility-timezone helpers
│   │   ├── temperature.ts          # fever-free streak logic
│   │   ├── dashboard.ts            # KPI computation
│   │   ├── analytics.ts            # mortality/survival math
│   │   └── permissions.ts          # role matrix
│   ├── hooks/use-patient-day-status.ts
│   ├── lib/
│   │   ├── env.ts                  # Supabase env helpers
│   │   ├── supabase/client.ts      # browser client
│   │   ├── supabase/server.ts      # server client
│   │   └── utils.ts
│   ├── middleware.ts               # Supabase session refresh
│   ├── services/
│   │   ├── demo-repository.ts      # data-access implementation
│   │   ├── demo-storage.ts         # localStorage adapter
│   │   ├── seed-data.ts            # synthetic dataset
│   │   ├── id.ts
│   │   └── demo-repository.test.ts # business-rule tests
│   └── test/setup.ts
├── supabase/migrations/001_initial_schema.sql
├── .env.example
├── CONTEXT.md                      # implementation progress log
├── startup.md                      # getting-started guide
└── vitest.config.ts
```

---

## Data Model

Nine normalized entities (see `supabase/migrations/001_initial_schema.sql` for full DDL, constraints, and partial unique indexes):

| Entity | Key fields |
|--------|-----------|
| **Patients** | `patient_code` (unique), `full_name`, `age`, `room_id`, `admitted_at`, `status` (admitted/discharged/deceased) |
| **Rooms** | `room_number` (unique), `status` (available/occupied) |
| **TemperatureReadings** | `patient_id`, `temperature_celsius`, `observed_at`, `facility_local_date`, `recorded_by`, `notes`, `correction_of_id` (nullable) |
| **DoctorVisits** | `patient_id`, `doctor_id`, `visited_at`, `clinical_notes`, `treatment_plan`, `follow_up_instructions`, `temperature_missing_flag` |
| **DischargeRequests** | `requested_by`, `eligibility_confirmed_by/at`, `administrative_processed_by/at`, `status`, `fever_free_dates[]` |
| **PatientOutcomes** | `outcome_type` (recovered/death), `outcome_at`, `recorded_by`, `notes` |
| **Users** | `full_name`, `email`, `role` (nurse/doctor/administrator), `active` |
| **AuditLogs** | `actor_id`, `entity_type/id`, `action`, `timestamp`, `previous_value`, `new_value` |
| **FacilitySettings** | `facility_name`, `maximum_capacity` (74), `fever_threshold_celsius` (38.0), `timezone` |

Integrity enforced in SQL:

- `one_active_patient_per_room` — partial unique index on `patients(room_id) WHERE status = 'admitted'`
- `one_routine_temp_per_patient_day` — partial unique index on `temperature_readings(patient_id, facility_local_date) WHERE correction_of_id IS NULL`
- `doctor_visits(patient_id, facility_local_date)` unique
- `maximum_capacity` CHECK constraint; status/outcome enum types

In Demo Mode, the equivalent validations run inside `DemoRepository` (single-browser limitation documented in the code).

---

## Testing

```bash
npm test          # single run
npm run test:watch
```

The Vitest suite covers the required critical business rules, including:

1. Registering a patient when capacity is available
2. Rejecting admission when all 74 beds are occupied
3. Rejecting duplicate room allocation
4. Recording a valid daily temperature
5. Rejecting duplicate routine temperature readings
6. Rejecting invalid temperature values
7. Tracking missing daily readings
8. Recording a doctor visit
9. Flagging a visit when today's temperature is missing
10. Fever-free streak calculation (0/1/2/3+ days)
11. Streak reset after fever
12. Streak break after missing data
13. Blocking administrative discharge without doctor confirmation
14. Releasing a room after completed discharge
15. Separating death outcomes from recovered discharges
16. Mortality and survival rate calculations
17. Zero resolved outcomes (insufficient data, no divide-by-zero)
18. Role permission enforcement
19. Dashboard metrics updating after state changes
20. Audit history retained after corrections

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | No — Demo Mode works without it | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No — Demo Mode works without it | Supabase public anon key |

- **Never** commit real credentials or use service-role keys in frontend code.
- Without these variables the app runs fully in Demo Mode.

---

## Supabase Setup (Optional)

Supabase integration is **partially implemented** (client/server helpers + middleware session refresh exist; repository + auth wiring in progress — see [`CONTEXT.md`](./CONTEXT.md) for current status).

1. **Create a project** at [supabase.com](https://supabase.com).
2. **Apply the schema** — run `supabase/migrations/001_initial_schema.sql` in the SQL Editor (or via `supabase db push` with the CLI).
3. **Seed users and rooms** — create auth users in Authentication → Users, matching `users` table rows with roles (`nurse` / `doctor` / `administrator`), plus the 74 rooms and a `facility_settings` row.
4. **Configure RLS** — enable Row Level Security on every table and add role-based policies so writes are authorized server-side (never rely on frontend-only checks).
5. **Set env vars** — add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` (locally) and to your Vercel project settings.
6. **Complete the repository** — implement `SupabaseRepository` with the same interface as `DemoRepository` and select it in `app-provider.tsx` when `isSupabaseConfigured()` is true.

---

## Deployment

### Vercel (frontend)

```bash
npm run build      # verify locally first
npm test           # and run tests
```

Then either:

- **Vercel CLI:** `npx vercel` and follow the prompts, or
- **Git integration:** import the repository at [vercel.com/new](https://vercel.com/new) — Next.js is auto-detected, no config file needed.

Environment configuration:

- **Demo Mode deployment:** no env vars required — the app works immediately.
- **With Supabase:** add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Project → Settings → Environment Variables, then redeploy.

### Supabase (backend)

Host PostgreSQL, Auth, and RLS on Supabase; point the env vars above at the project and apply the migration + seed as described in [Supabase Setup](#supabase-setup-optional).

> **Note:** This build has not been deployed in the current session (no Vercel credentials available). Do not expect a public URL until a deployment actually succeeds.

---

## Known Limitations

- **Demo Mode is single-browser** — `localStorage` is per-origin/per-browser; it is not a secure multi-user database. Concurrent tabs share data but have no server-side concurrency control.
- **Supabase is not fully wired** — auth helpers, middleware, and SQL schema exist, but `SupabaseRepository`, real login, RLS policies, and DB seeding remain in progress (tracked in `CONTEXT.md`).
- **Role checks in Demo Mode are client-side** — adequate for demonstration, insufficient for real security.
- **Seed scenarios are concentrated** — rich edge cases live on featured patients; overall occupancy reflects the synthetic admissions/discharges/deaths.
- **15% mortality benchmark** comes from the problem statement; it is not a validated prediction for small sample sizes (stated in-app).
- **Not for clinical use** — no diagnosis, treatment, or medical-device integration; no HIPAA/GDPR compliance claims.

---

## Further Reading

- [`startup.md`](./startup.md) — step-by-step local startup & troubleshooting
- [`CONTEXT.md`](./CONTEXT.md) — implementation progress log and resume plan (Supabase/Vercel status)
- `src/domain/` — the business rules in executable form

---

## License

Assessment demonstration — synthetic data only, not for clinical production use.
