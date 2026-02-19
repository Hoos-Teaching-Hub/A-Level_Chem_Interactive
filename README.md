# A-Level Chemistry Interactive

Modern React + Vite frontend for the M0 milestone (code-based access, student progress tracking, and teacher insights)
with standalone organic map assets under `public/`. The roadmap lives in
[`docs/roadmap.md`](docs/roadmap.md) and should guide all M0 feature work.

## Milestones and history

- Milestone scope and acceptance checks: [`docs/roadmap.md`](docs/roadmap.md)
- Implementation history and verification logs: [`docs/development-history.md`](docs/development-history.md)

## Project structure (M0 frontend)

```
public/
  organic-map.html     # Standalone organic map entry page
  js/                  # Standalone map runtime/data scripts
  css/                 # Standalone map styles
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
- `http://localhost:5173/map` for the integrated reaction map route.
- `http://localhost:5173/teacher` for the teacher login flow.

After a successful student join, the app shows the Student MVP dashboard with mock activities,
local progress updates, a sync status bar, and quick actions to open/jump to the reaction map.
The activity detail panel now includes structured M1 blocks: `What`, `How`, `Why`, and `Exam tip`.
After a successful teacher login, the app shows a dashboard with stats, leaderboard, activity
distribution, search, and CSV export.

Standalone organic map assets remain available at `http://localhost:5173/organic-map.html`.
The main app embeds this map directly at `/map`.

Run the full local verification checks (including build + edge tests) before pushing:

```sh
npm run verify:local
```

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

Configure frontend API routing for edge functions.
Vite only exposes variables prefixed with `VITE_`, and local development should
use `.env.local` (or `.env.development.local`).

Example `.env.local`:

```sh
VITE_SUPABASE_URL="http://127.0.0.1:54321"
```

Option A (explicit edge functions URL):

```sh
VITE_API_BASE_URL="http://127.0.0.1:54321/functions/v1"
```

Option B (Supabase host URL; frontend appends `/functions/v1` automatically):

```sh
VITE_SUPABASE_URL="http://127.0.0.1:54321"
```

If `VITE_API_BASE_URL` is set, it takes precedence over `VITE_SUPABASE_URL`.
For `VITE_API_BASE_URL`, either a host root (`http://127.0.0.1:54321`) or an
explicit functions path (`http://127.0.0.1:54321/functions/v1`) is supported.
When a host root is used, the client retries 404 responses once with
`/functions/v1` appended so local Supabase route-miss JSON responses still
resolve correctly.
If neither `VITE_API_BASE_URL` nor `VITE_SUPABASE_URL` is configured, the app
fails fast with a setup error instead of silently calling a missing relative endpoint.

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

The same output file also includes one deterministic manual test set:
`manual_test_class_code`, `manual_test_teacher_code`, and `manual_test_student_1_code`.
Override these defaults with `MANUAL_TEST_CLASS_CODE`, `MANUAL_TEST_TEACHER_CODE`,
`MANUAL_TEST_STUDENT_CODE`, and `MANUAL_TEST_STUDENT_NAME` if needed.

## Supabase Edge Functions (local)

Start the edge functions with the required environment variables. The service role key is
**server-only**: it must stay in the edge function environment and never be exposed in the frontend.
This project uses custom code/session auth, so function JWT verification is disabled in
`supabase/config.toml` for `join`, `load`, `save`, and `teacher`.

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
- **Map static assets:** `public/organic-map.html`, `public/js/`, `public/css/`.
