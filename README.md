# A-Level Chemistry Interactive

Modern React + Vite frontend for the M0 milestone (code-based access, student progress tracking, and teacher insights)
with legacy organic map assets preserved under `public/legacy/`. The roadmap lives in
[`docs/roadmap.md`](docs/roadmap.md) and should guide all M0 feature work.

## M0 focus (current milestone)

M0 delivers a minimal but secure foundation:

- **Code-based access** for students and teachers (class codes, student codes, teacher codes).
- **Progress storage** with clear role boundaries (students see their own; teachers see aggregates).
- **Minimal teacher view** with coverage and weak topic insights.
- **Role gating** for student vs. teacher routes.

See the M0 task breakdown (T1–T4) in the roadmap for detailed scope and QA checks.

Role gating uses a lightweight session storage flag (`chem.role`) that is set after a successful
student join or teacher login. The teacher route and teacher-only UI are blocked when the role is
`student`, keeping the M0 access boundary explicit without adding full auth state yet.

## M0 T4 — Offline-first sync (local-first progress)

**What changed**
- Frontend API helpers now call edge functions (`/join`, `/load`, `/save`, `/teacher/report`).
- Student sessions and progress are stored locally (`chem.sessionToken`, `chem.studentProfile`,
  `chem.progress`, `chem.lastSyncAt`).
- Teacher code is stored in session storage (`chem.teacherCode`) after a successful report fetch.
- Background sync runs on the student route load and when the browser comes back online.

**Why**
- Aligns with the M0 roadmap T4 requirement for local-first progress storage and background sync
  using `updated_at` conflict resolution.

**How to verify**
- Run the M0 test suite (see below).
- Join a class and confirm local storage keys are populated in the browser.

## Project structure (M0 frontend)

```
public/
  legacy/              # Legacy static site (organic map + assets)
src/
  app/                 # App shell + router
  api/                 # API client placeholders (M0)
  components/          # Shared UI components + forms
  pages/               # Route-level pages (Student/Teacher)
  validators/          # Zod schemas for forms
  index.css            # Tailwind entry point + base styles
  main.tsx             # React entry
```

## Run locally

Install dependencies and start the dev server:

```sh
npm install
npm run dev
```

Then open:

- `http://localhost:5173/student` for the student join flow.
- `http://localhost:5173/teacher` for the teacher login flow.

After a successful student join, the app shows the Student MVP dashboard with mock activities,
local progress updates, and a sync status bar.
After a successful teacher login, the app shows a dashboard with stats, leaderboard, activity
distribution, search, and CSV export.

Legacy organic map assets remain available at `/legacy/` (for example,
`http://localhost:5173/legacy/organic-map.html`).

## Deployment

See `docs/deployment.md` for local setup, GitHub Pages test deployment, and
production deployment guidance.

## Tests

Run the required structure and edge checks in order:

```sh
node tests/paths.test.js
node tests/structure.test.js
bash scripts/test-edge.sh
```

## Environment configuration

Set the API base URL for the frontend fetch helpers:

```sh
VITE_API_BASE_URL="https://api.example.com"
```

## Database initialization (Supabase)

Follow the M0 roadmap task (T2) by applying the migrations under `supabase/migrations/`.

```sh
supabase db reset
```

Then generate demo seed data (hash-only codes in the database, plaintext stored locally):

```sh
SERVER_SALT="change-me" node supabase/seed/seed-demo.mjs
psql "$SUPABASE_DB_URL" -f supabase/seed/seed-demo.sql
```

The plaintext demo class/teacher/student codes are written to `supabase/seed/demo-codes.txt`
and should stay local (not committed). The database only receives SHA-256 hashes derived from
`<code>:<class_code>:<server_salt>`.

## Supabase Edge Functions (local)

Start the edge functions with the required environment variables. The service role key is
**server-only**: it must stay in the edge function environment and never be exposed in the frontend.

```sh
SUPABASE_URL="http://localhost:54321" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
SERVER_SALT="change-me" \
supabase functions serve --no-verify-jwt
```

### Edge function curl examples

Replace `${SUPABASE_URL}` with the URL you used above (for example `http://localhost:54321`).
Session-based endpoints require a bearer token. The `since` example is shown on the load endpoint.

```sh
# POST /join
curl -X POST "${SUPABASE_URL}/functions/v1/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SESSION_TOKEN}" \
  -d '{
    "class_code": "CHEM101",
    "student_code": "S-001",
    "display_name": "Ada"
  }'

# GET /load (with ?since=)
curl "${SUPABASE_URL}/functions/v1/load?since=2024-01-01T00:00:00Z" \
  -H "Authorization: Bearer ${SESSION_TOKEN}"

# POST /save
curl -X POST "${SUPABASE_URL}/functions/v1/save" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SESSION_TOKEN}" \
  -d '{
    "updates": [
      { "activity_id": "alcohols-oxidation", "state": { "status": "done" } }
    ]
  }'

# GET /teacher/report
curl "${SUPABASE_URL}/functions/v1/teacher/report?class_code=CHEM101&teacher_code=TEACH-123" \
  -H "Authorization: Bearer ${SESSION_TOKEN}"
```

## Where to add new M0 work

- **Frontend flows (T1):** `src/pages/`, `src/components/`, `src/app/`.
- **API client & validation (T1/T3):** `src/api/`, `src/validators/`.
- **Legacy content:** `public/legacy/` (read-only unless you are updating legacy assets).
