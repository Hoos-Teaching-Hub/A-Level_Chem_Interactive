# Agent Instructions (A-Level_Chem_Interactive)

These instructions apply to all work in this repository. Follow them strictly.

## 0) Development guideline
- Use `docs/roadmap.md` as the source of truth for scope, priorities, and acceptance checks.
- If a request conflicts with the roadmap, call out the conflict and ask which to prioritize.

## 1) Plan-first workflow (before editing files)
Before making any changes, produce a short plan that includes:
- Goal: restate the intended behavior change in plain language.
- Options: 2–3 implementation options (prefer minimal-diff first) with trade-offs.
- Risks/edge cases: list likely failure modes (including flakiness, timing, config/env, backward compatibility).
- Files to touch: enumerate the files/directories you expect to modify.
- Test plan: which tests you will add/run and in what order.

Do not start editing until the plan is written.

## 2) Test-driven development (with “Option B” guardrail)
Use a test-driven workflow:
- If new behavior is requested, add or update tests first, then implement.

You MAY edit files under `tests/` without asking for approval, EXCEPT when the change weakens or bypasses tests.

### 2.1) Ask for approval before weakening/bypassing tests
Ask for approval before any test change that does one or more of the following:
- Deletes a test or reduces assertion strength/coverage.
- Marks tests as skipped/disabled (e.g. `skip`, commenting out, early returns).
- Significantly increases timeouts or retry counts compared to existing norms.
- Broadens expected outputs in a way that makes a failing behavior “pass” without fixing the underlying bug.
- Updates snapshots/golden data/fixtures in a way that loosens correctness expectations.

Adding new tests, refactoring test code without changing meaning, or making assertions stricter does NOT require approval.

## 3) Sensitive files
Ask for approval before modifying:
- `AGENTS.md` (this file).

## 4) Mandatory test execution before finishing
You must run tests before claiming the work is done.

Run commands in this order:
1) `node tests/paths.test.js`
2) Any additional relevant tests affected by the change (list them explicitly)
3) `bash scripts/test-edge.sh`

Rules:
- Do not say “tests passed” unless you actually ran them and saw them pass.
- If tests fail, report the failures and either fix them or stop and ask for direction.
- If you cannot run tests in the current environment, explain exactly what you tried and why it could not run (then do not claim “done”).

## 5) Completion report (required)
At the end of each task, provide:
- Summary of changes (brief).
- Files changed (bullet list).
- Tests run and results (per command).
- Remaining risks / follow-ups (if any).

## 6) Code quality and reviewability
- Prefer minimal, reviewable diffs unless a refactor is clearly justified by the plan.
- Keep each commit (or change set, if commits are not available) focused on a single functional change.
- Avoid drive-by formatting changes.

## 7) Comments and documentation
- Add detailed comments (in English) for non-trivial logic, tricky edge cases, or surprising behavior.
- After finishing the code change, update relevant documentation to reflect the change (but do not modify `AGENTS.md` without approval).

## 8) Reliability rules (especially for integration-style behavior)
- Avoid fixed sleeps; prefer retry/poll with timeouts when waiting for eventual consistency.
- When tests involve external services or local stacks, be explicit about isolation, cleanup, and determinism.
