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

## Where to add new M0 work

- **Frontend flows (T1):** `src/pages/`, `src/components/`, `src/app/`.
- **API client & validation (T1/T3):** `src/api/`, `src/validators/`.
- **Legacy content:** `public/legacy/` (read-only unless you are updating legacy assets).
