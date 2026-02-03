# M0 Development Guide

## Purpose
This guide defines how to implement the M0 milestone (T1–T6) using a **test‑driven workflow** (tests first, then implementation). It complements and **defers scope to** the canonical roadmap in `docs/roadmap.md` and should be used alongside it for acceptance checks and priorities.

> **Source of truth:** `docs/roadmap.md` remains authoritative for scope, success criteria, and dependencies. This guide explains *how* to execute M0 work in a consistent, test‑first manner.

---

## M0 task overview (from the roadmap)
Each task below mirrors the roadmap’s M0 breakdown. Treat the roadmap as canonical and keep this guide aligned if scope shifts.

- **T1 — Frontend skeleton** (routes, forms, base UI)
- **T2 — DB schema + migrations**
- **T3 — Edge functions** (join, load, save, teacher/report)
- **T4 — Offline‑first sync**
- **T5 — Student MVP**
- **T6 — Teacher dashboard**

Reference: `docs/roadmap.md` → “8) Code-based access & progress sync plan (detailed task list)”.

---

## Repo map (where M0 work lives today)
Use these existing locations to keep changes consistent with the current codebase layout:

- **Frontend**: `src/` (routes, UI, client logic). Static assets live in `public/`.
- **Edge functions**: `supabase/functions/` (join/load/save/teacher/report).
- **Database**: `supabase/migrations/` (schema), `supabase/seed/` and `supabase/seed.sql` (seed data).
- **Tests**: `tests/` (current suites: `paths.test.js`, `db.test.js`, `structure.test.js`).
- **Test scripts**: `scripts/` (e.g., `scripts/test-edge.sh`).

---

## Workflow: test‑driven development (TDD)
**Rule:** for any new behavior, **write or update tests first**, then implement.

1. **Define the behavior** to add (based on the roadmap acceptance checks).
2. **Add/adjust tests** to encode the expected behavior.
3. **Implement the change** until tests pass.
4. **Document the change** (update relevant docs).

### TDD guardrails
- Avoid weakening existing tests (see repo AGENTS instructions).
- Prefer minimal, reviewable diffs.
- Add comments for non‑trivial logic and tricky edge cases.

---

## Mandatory test execution order (must run before finishing)
Run tests in this **exact order** and report results in the completion summary:

1. `node tests/paths.test.js`
2. Additional relevant tests for the change (list explicitly)
3. `bash scripts/test-edge.sh`

If any test fails, stop and address the failure or document why the environment prevents completion.

---

## Task‑by‑task guidance (tests first)
Use the acceptance checks from the roadmap to determine which tests to create or update.

### T1 — Frontend skeleton (routes, forms, base UI)
**Scope:** `/student` + `/teacher` routes, join/login forms, base layout/UI. See roadmap for full scope. Primary implementation area is `src/`.

**Tests to write first (examples):**
- Route access/render checks for student/teacher views.
- Form validation tests for join/login inputs (if using Zod/React Hook Form).

**Implementation notes:**
- Keep UI structure minimal and stable.
- Ensure role gating matches roadmap guidance.

### T2 — DB schema + migrations
**Scope:** tables for classes, students, sessions, progress; teacher auth hash storage. Primary implementation area is `supabase/migrations/`.

**Tests to write first (examples):**
- Migration sanity checks (schema contains required tables/columns).
- Permissions/row‑level access tests where applicable.

**Implementation notes:**
- Keep migrations small and reversible.
- Document schema expectations in relevant docs.

### T3 — Edge functions (join, load, save, teacher/report)
**Scope:** Deno edge functions with validation, hashing, and rate limiting per roadmap. Primary implementation area is `supabase/functions/`.

**Tests to write first (examples):**
- Input validation (Zod) for each function.
- “A cannot read/write B” isolation test.
- Report aggregation behavior for teacher/report.

**Implementation notes:**
- Standardize errors and responses.
- Use deterministic, testable helpers.

### T4 — Offline‑first sync
**Scope:** local‑first storage + background sync, conflict resolution via `updated_at`. Primary implementation area is `src/` with any storage helpers located alongside related features.

**Tests to write first (examples):**
- Local persistence survives refresh/offline.
- Conflict resolution favors latest `updated_at`.
- Sync retry behavior uses timeouts, not fixed sleeps.

**Implementation notes:**
- Avoid hard sleeps; use polling with timeouts.
- Surface sync status in UI.

### T5 — Student MVP
**Scope:** activity list + activity page + status bar. Primary implementation area is `src/`.

**Tests to write first (examples):**
- Activity list renders from mocked data.
- Sync status reflects offline/online states.

**Implementation notes:**
- Keep data model aligned with roadmap expectations.

### T6 — Teacher dashboard
**Scope:** stats, leaderboard, distribution, CSV export. Primary implementation area is `src/` with report calls wired to `supabase/functions/teacher/report`.

**Tests to write first (examples):**
- Report page renders with aggregated data.
- CSV export generates expected headers and data.

**Implementation notes:**
- Prefer server‑side aggregation for large classes.

---

## Completion checklist (required)
Before marking a task as done:
- ✅ Tests run in required order and results recorded.
- ✅ Documentation updated (if behavior or scope changed).
- ✅ Changes align with `docs/roadmap.md` acceptance checks.
