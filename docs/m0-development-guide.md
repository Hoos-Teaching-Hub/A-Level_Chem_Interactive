# M0 Development Guide (TDD Sequence + Success Criteria)

This guide builds on the main roadmap and should be read alongside it.
See the milestone overview and M0 task breakdown in [`docs/roadmap.md`](./roadmap.md).

## TDD sequence for M0 work

Use this order for every M0 task to keep development aligned with the roadmap and the repo's testing expectations:

1. **Write or extend tests first.**
   - Prefer existing coverage in [`tests/`](../tests/) and edge-function checks in [`supabase/functions/tests/`](../supabase/functions/tests/).
2. **Implement the behavior.**
   - Follow the M0 scope in the roadmap and keep changes scoped to the task.
3. **Run the primary test suite.**
   - `node tests/paths.test.js`
4. **Run edge-function checks.**
   - `bash scripts/test-edge.sh`

## M0 success criteria checklist

Use this checklist to confirm the M0 milestone is ready:

- [ ] **Auth flow**: Code-based join/login (class code + student code + display name) works end-to-end with server-side hashing.
- [ ] **Row-level security (RLS)**: Students can only read/write their own progress records.
- [ ] **Teacher report**: Teacher view shows aggregated coverage (average progress across activity rows) and weak topics (lowest average progress by topic from `progress.state`) without exposing student identities.
- [ ] **Role gating**: Student accounts cannot access teacher-only pages or endpoints. The current
      frontend uses a session storage flag (`chem.role`) to block teacher routes/UI until backend
      auth is in place.

## Relevant tests to link into M0 work

### Core repo tests

- [`tests/paths.test.js`](../tests/paths.test.js) — primary path/structure validation for the dataset.
- [`tests/db.test.js`](../tests/db.test.js) — database schema/constraint checks.
- [`tests/structure.test.js`](../tests/structure.test.js) — structural integrity of core data.

### Edge function tests

- [`supabase/functions/tests/unit/`](../supabase/functions/tests/unit/) — fast, pure unit checks for shared helpers.
- [`supabase/functions/tests/integration/`](../supabase/functions/tests/integration/) — local Supabase stack integration checks for edge functions.
- [`supabase/functions/tests/testkit/sample-progress.ts`](../supabase/functions/tests/testkit/sample-progress.ts) — deterministic sample data set used by teacher-report aggregation tests.

## Documentation expectations

For each M0 task, record:

1. What changed.
2. Why the change was needed (roadmap alignment).
3. How to verify (tests + manual steps).

Keep documentation close to the change and cross-link to the roadmap where relevant.
