# Agent Instructions

- Always run the test suite before finishing a change.
- Set up or update tests before implementing new behavior (test-driven workflow).
- Preferred command: `node tests/paths.test.js`.
- If additional tests are added later, run them too and report results.
- After finishing work, run `bash scripts/test-edge.sh`.
- Confirm with the user before modifying `AGENTS.md` or anything under `tests/`.
- Use `docs/roadmap.md` as the development guideline.
- Add detailed comments for non-trivial logic in new or refactored code.
