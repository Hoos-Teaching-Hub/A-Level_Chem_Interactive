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

Legacy organic map assets remain available at `/legacy/` (for example,
`http://localhost:5173/legacy/organic-map.html`).

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

## Where to add new M0 work

- **Frontend flows (T1):** `src/pages/`, `src/components/`, `src/app/`.
- **API client & validation (T1/T3):** `src/api/`, `src/validators/`.
- **Legacy content:** `public/legacy/` (read-only unless you are updating legacy assets).
