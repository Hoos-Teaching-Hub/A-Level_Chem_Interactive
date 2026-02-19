# Development History

This document tracks milestone implementation history and verification notes.
For scope and acceptance criteria, use the canonical roadmap in
[`docs/roadmap.md`](./roadmap.md).

## M0 T4 — Offline-first sync (local-first progress)

### What changed
- Frontend API helpers call edge functions (`/join`, `/load`, `/save`, `/teacher/report`).
- Student sessions and progress are stored locally (`chem.sessionToken`, `chem.studentProfile`,
  `chem.progress`, `chem.lastSyncAt`).
- Teacher code is stored in session storage (`chem.teacherCode`) after report fetch.
- Background sync runs on student route load and when the browser comes back online.

### Why
- Aligns with the M0 roadmap T4 requirement for local-first progress storage and background sync
  using `updated_at` conflict resolution.

### How to verify
- Run the M0 test suite (see README tests section).
- Join a class and confirm local storage keys are populated in the browser.

## M1 metadata completion — Structured metadata + fixed info blocks

### What changed
- Reaction-map nodes include `level`, `topic`, and `examTips`.
  - `level` may be `AS`, `A2`, or `AS/A2` when a node spans both phase section tags.
- Reaction-map links include `conditions`, `mechanismSummary`, `quizData`, and `animationId`.
- Map data files expose `window.OrganicMapData` in browser runtime while keeping
  CommonJS exports for Node-based test imports.
- Map runtime uses an explicit global script chain (`THREE` + `SpriteText` + `ForceGraph3D`)
  with CDN fallback loading, while map logic remains isolated in `js/main.js`.
- Map includes a built-in local 3D canvas fallback renderer when `ForceGraph3D` cannot load,
  so the map remains visible and navigable.
- Nodes and links include explicit `syllabusSections` tags (CIE 9701 section numbers).
- Side panel includes fixed `What / How / Why / Exam tip` blocks with safe fallbacks.
- Schema checks enforce metadata quality across the full map:
  - Every node has non-fallback `topic` and at least one `examTip`.
  - Every link includes `reagents`.
  - Every non-structural reaction link includes valid `quizData` and `animationId`.
  - Every node and link includes valid `syllabusSections`.
  - M1 phase coverage targets validate sections `13-22` and `29-37`.
  - No orphan nodes are allowed.

### How to verify
- Run `node tests/m1-data-model.test.js`.
- Run `node tests/m1-syllabus-coverage.test.js`.
- Run `node tests/m1-chemistry-content.test.js`.
- Open `/organic-map.html`, click a node or reaction link, and confirm all four info blocks populate.
- In browser devtools, confirm `document.querySelector('#mynetwork canvas')` returns an element.

## M2 kickoff — Mechanism animation player (first slice)

### What changed
- Added a shared animation registry module at `public/js/animations.js` and `src/js/animations.js`.
  - Registry entries are generated from `animationId` values in map links, with curated overrides
    for key mechanisms.
- Added an embedded mechanism animation panel to the map sidebar:
  - `animationPanel`, `animationTitle`, `animationSummary`, `animationStep`, `animationSvg`,
    `animationPath`, `animationMarker`.
- Updated map runtime to load `window.OrganicMapAnimations`, prepare per-link animation specs,
  and play a reusable SVG path animation.
- Added explicit fallback behavior when animation metadata is missing:
  - `No animation ID is attached to this pathway yet.`
  - `No animation asset is registered for this pathway yet.`

### Why
- Aligns with roadmap M2 requirement for a reusable animation player + registry with graceful
  fallback behavior.

### How to verify
- Run `node tests/m2-animation-player.test.js`.
- Open `/organic-map.html`, click a reaction link, then click `Simulate Reaction`.
- Confirm the sidebar animation panel updates title/summary/step text and animates the marker on
  the SVG path.
