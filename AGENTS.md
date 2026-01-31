# Agent Instructions — A-Level_Chem_Interactive

These rules apply to all changes in this repository.

## 1) Source of truth and scope
- Use `docs/roadmap.md` as the primary development guideline for M0 scope and QA expectations.
- If a request conflicts with the roadmap, point out the conflict and ask which to prioritize.
- Keep M0 boundaries explicit (student vs teacher) and do not accidentally blur role access.

## 2) Plan-first (before editing files)
Before changing any files, write a short plan that includes:
- The goal (what behavior changes, in plain language).
- 2–3 implementation options (minimal-diff first), with trade-offs.
- Key risks/edge cases (auth boundaries, flakiness, env/config, backwards compatibility).
- The exact files you expect to touch.
- A test plan: which tests you will add/run and in what order.

## 3) Test-driven workflow (TDD)
Use a TDD sequence aligned to M0:
1) Write or extend tests first.
2) Implement the behavior.
3) Run the primary test suite: `node tests/paths.test.js`
4) Run edge-function checks: `bash scripts/test-edge.sh`

## 4) Tests policy (Option B: approval only when weakening tests)
You may modify files under `tests/` as needed, including adding new tests and refactoring tests without changing meaning.

Ask for approval before any change that weakens or bypasses tests, including:
- Deleting a test, or reducing assertion strictness/coverage.
- Skipping/disabled tests (e.g., `skip`, commenting out, early returns).
- Significantly increasing timeouts or retry counts beyond existing norms.
- Broadening expected outputs to make failures pass without fixing the underlying behavior.
- Updating snapshots/golden data/fixtures in a way that loosens correctness.

If a test must be weakened for a legitimate reason, explain the reason and propose an alternative that preserves signal.

## 5) Mandatory test execution before finishing
Before claiming the task is complete, you must run:
1) `node tests/paths.test.js`
2) Any additional relevant tests affected by your change (list them explicitly)
3) `bash scripts/test-edge.sh`

Rules:
- Do not claim “tests passed” unless you actually ran them and observed success.
- If tests fail, report the failure and either fix it or stop and ask for direction.
- If the environment prevents running tests, state exactly what you tried and why it cannot run, then stop short of “done”.

## 6) Sensitive file rule
Ask for approval before modifying `AGENTS.md` (this file).

## 7) Security / secrets / local-only artifacts
- Never expose the Supabase service role key to the frontend. Treat it as server-only.
- Do not commit local-only plaintext codes (e.g., demo codes) or other secret-like artifacts.
- Treat `supabase/.env.edge` as test-runner-generated local config (do not commit it unless explicitly requested).

## 8) Reliability rules (avoid flaky behavior)
- Avoid fixed sleeps in tests; prefer retry/poll with timeouts for eventually-consistent operations.
- For Supabase/edge-function work, be explicit about isolation, cleanup, and determinism.

## 9) Code style and reviewability
- Keep changes minimal and reviewable; avoid drive-by formatting.
- Keep each commit (or change set) focused on a single functional change.
- Add detailed comments (in English) for non-trivial logic or tricky edge cases.

## 10) Documentation updates
After finishing work, update relevant documentation to reflect behavior changes and how to verify them.
For each M0 task, record:
- What changed
- Why (roadmap alignment)
- How to verify (tests + any manual steps)

## 11) Required completion report (every task)
At the end of work, include:
- Summary of changes
- Files changed
- Tests run + results (per command)
- Any remaining risks or follow-ups
