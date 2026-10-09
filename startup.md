# Getting Started — QuarantineCare

How to start, verify, and run the project locally.

## Prerequisites

- **Node.js 20+** (Next.js 16 requirement)
- **npm 10+** (comes with Node)
- No database or external service required — the app runs in **Demo Mode** out of the box.

## 1. Install dependencies

```bash
npm install
```

## 2. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (if port 3000 is busy, Next.js uses the next free port, e.g. `http://localhost:3001` — check the terminal output).

## 3. Log in

On the login page, use the **Demo Access** panel and pick a role:

| Role | What you can do |
|------|-----------------|
| **Nurse** | Record daily temperatures, view patient vitals |
| **Doctor** | Doctor rounds, clinical notes, confirm discharge eligibility |
| **Administrator** | Register patients, complete discharges, analytics, settings |

> Demo role selection is a UI demonstration, not a security boundary. All data is synthetic and stored in your browser's `localStorage`.

### Suggested demo path

1. **Nurse** → *Temperature Tracking* → record a temperature for a pending patient (e.g. Mohammed Ali).
2. **Doctor** → *Doctor Rounds* → record today's visit (you'll see a warning if the temperature is still missing).
3. **Doctor** → *Discharge Management* → confirm eligibility for a patient with 3 fever-free days (e.g. Sneha Patel).
4. **Administrator** → *Discharge Management* → complete the administrative discharge, then check the freed bed on the Dashboard.
5. **Analytics** → mortality/survival rates with numerator/denominator vs. the 15% benchmark.

Use **Settings → Reset demo data** to restore the original synthetic dataset at any time.

## 4. Verify the build

```bash
npm test          # Vitest — business-rule tests
npm run lint      # ESLint
npm run build     # production build
npm start         # serve the production build locally
```

Run `npm test` and `npm run build` before any deployment.

## 5. Environment variables (optional — Supabase)

Demo Mode needs **no** environment variables. To connect a real Supabase backend later:

```bash
copy .env.example .env.local    # Windows
# or: cp .env.example .env.local  # macOS/Linux
```

Then fill in:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from your Supabase project → **Project Settings → API**. Never commit `.env.local` or expose service-role keys in frontend code.

## 6. Deploying (optional)

- **Vercel:** import the repo (or run `vercel`), set the two `NEXT_PUBLIC_SUPABASE_*` env vars in project settings if using Supabase. Demo Mode works with no env vars at all.
- **Supabase:** create a project and run `supabase/migrations/001_initial_schema.sql` in the SQL editor.

See `README.md` for full deployment details and `CONTEXT.md` for current implementation status.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Port already in use | Next.js auto-picks the next port; check terminal output, or run `npm run dev -- -p 3001` |
| Stale/broken demo data | **Settings → Reset demo data** (or clear the site's `localStorage`) |
| Tests fail to find DOM matchers | `npm install` again — `src/test/setup.ts` loads `@testing-library/jest-dom` |
| Changes not appearing | Hard-refresh the browser; Demo Mode persists data in `localStorage` per origin |
