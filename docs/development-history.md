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
- Added an interactive canvas mechanism player inside the panel:
  - `animationCanvas`, `animationPlayBtn`, `animationProgress`, `animationResetBtn`.
  - Slider scrubbing and play/pause now control step-by-step mechanism playback.
- Updated map runtime to load `window.OrganicMapAnimations`, prepare per-link animation specs,
  and play a reusable SVG path animation.
- Added SVG cue overlays for curated mechanism entries:
  - dipole markers, lone-pair markers, and curved electron-movement arrows.
  - cue layers render per mechanism step in the animation panel.
- Added explicit fallback behavior when animation metadata is missing:
  - `No animation ID is attached to this pathway yet.`
  - `No animation asset is registered for this pathway yet.`

### Why
- Aligns with roadmap M2 requirement for a reusable animation player + registry with graceful
  fallback behavior.

### How to verify
- Run `node tests/m2-animation-player.test.js`.
- Run `node tests/m2-animation-visuals.test.js`.
- Open `/organic-map.html`, click a reaction link, then click `Simulate Reaction`.
- Confirm the sidebar animation panel updates title/summary/step text and the canvas animation
  responds to play/pause/slider/reset controls.
- Confirm dipole markers, lone-pair markers, and electron-movement arrows are visible for curated
  pathways.
- Confirm atom and bond scaffolds are visible for curated pathways.

## M2 sidebar usability pass — class visibility + mechanism navigation

### What changed
- Added compound sidebar blocks for:
  - `Class` display,
  - `Example Structure (>=3 C)`,
  - direct `Mechanism Navigation` buttons for linked pathways.
- Compound clicks now render a 3+ carbon example structure for revision context.
- Mechanism navigation buttons jump from compound view directly into reaction mechanism playback.
- Node class is now visible in map interactions:
  - hover label in `ForceGraph3D`,
  - fallback canvas map text annotation.
- Sidebar panel is now scrollable with a visible styled scrollbar for dense content.

### Why
- Reduces friction when moving from compound knowledge to mechanism review.
- Makes class recognition immediate in the map and adds concrete structure examples for each compound class.
- Prevents content clipping in the sidebar as M2 content density increases.

### How to verify
- Run `node tests/structure.test.js`.
- Open `/organic-map.html`, click several compounds, and confirm:
  - class and example structure are shown,
  - mechanism navigation buttons appear for linked pathways.
- Click a mechanism navigation button and confirm the reaction/mechanism view opens and plays.
- Confirm the sidebar can be scrolled when content exceeds viewport height.

## M2 map readability pass — persistent node labels + 2D/3D toggle

### What changed
- Added persistent node labels in the ForceGraph renderer, showing:
  - compound name,
  - class label on a second line.
- Label rendering now has two paths:
  - primary: `SpriteText`,
  - fallback: built-in `THREE.Sprite` canvas labels when `SpriteText` is unavailable.
- Added a sidebar `2D/3D` toggle button (`viewModeBtn`) to switch graph dimensionality via
  `Graph.numDimensions(2|3)`.
- In `2D` mode:
  - node spheres are reduced in size for readability,
  - orbit controls lock to a flat camera plane to avoid accidental tilt/rotation.
- Updated electrophilic addition cue geometry so the bromide attack arrow starts at a bromide
  lone pair and terminates at the carbocation `+` marker.
- Added safe fallback behavior:
  - if `SpriteText` is unavailable, built-in sprite labels keep names visible,
  - if graph dimensional control is unavailable or fallback map mode is active, the toggle is disabled.

### Why
- Keeps node identity visible at all times without requiring hover.
- Allows flattening to 2D mode to reduce visual complexity and render workload on lower-spec devices.

### How to verify
- Run `node tests/structure.test.js`.
- Open `/organic-map.html` and confirm node labels are always visible in the map view.
- Click the `2D` button and confirm the graph flattens; click `3D` to restore depth.

## M2 QA tooling pass — automated visual smoke capture

### What changed
- Added a Playwright-based visual smoke runner at `scripts/visual-smoke.js`.
- Added npm commands:
  - `npm run test:visual` (build + screenshot capture),
  - `npm run test:visual:fast` (screenshot capture only).
- Added screenshots output target: `artifacts/visual/`.
- Added wiring tests to enforce visual smoke command + script documentation.

### Why
- Enables repeatable browser-level visual confirmation for map regressions.
- Shortens feedback loop for UI issues like blank/black map renders, missing labels, or broken 2D mode.

### How to verify
- Run `node tests/visual-smoke.test.js`.
- Run `npx playwright install chromium` (first-time setup).
- Run `npm run test:visual`.
- Confirm screenshots exist in `artifacts/visual/`.

## M2 UI cleanup — remove class text from map surface

### What changed
- Removed visible class text from map runtime surfaces:
  - node hover labels and persistent labels now show only compound names,
  - compound detail header now shows `Chemical Compound` (without class suffix),
  - fallback canvas renderer no longer draws a second class line under each node.
- Removed the dedicated `Class` block from the compound sidebar panel.
- Kept internal topic/class data for non-visual logic (e.g., example-structure fallback mapping).

### Why
- Reduces label clutter and keeps the map focused on compound identity and mechanism navigation.

### How to verify
- Run `node tests/structure.test.js`.
- Open `/organic-map.html` and confirm no `Class` text appears in node labels/tooltips or compound details.

## M2 interaction polish — 2D node click uses flat focus behavior

### What changed
- Updated node click behavior in `2D` mode:
  - camera now pans and zooms to the clicked node in the flat plane,
  - camera target stays in 2D (`z=0`) with no rotate-style movement,
  - focus depth is now fixed to a tighter zoom (`TWO_D_FOCUS_DEPTH = 60`) to match 3D click emphasis,
  - sidebar compound details still open on click.
- Kept existing 3D click camera behavior unchanged.

### Why
- Matches 2D mode expectation: flat map interaction should avoid camera rotation while still focusing clearly on selection.

### How to verify
- Open `/organic-map.html`, switch to `2D`, and click multiple nodes.
- Confirm each click opens details and performs non-rotating focus movement toward the selected node.

## M2 CI compatibility fix — align map bootstrap with legacy runtime guardrails

### What changed
- Removed explicit `three.min.js` loading from `public/organic-map.html`.
- Kept only the `3d-force-graph` CDN script as the primary runtime include.
- Replaced custom persistent `nodeThreeObject` label rendering with native ForceGraph node rendering
  to avoid cross-version Three.js runtime crashes.
- Updated `tests/structure.test.js` assertions so they align with the existing legacy map bootstrap/CDN tests.

### Why
- Fixes CI failures caused by contradictory map bootstrap expectations across tests.
- Preserves the safer compatibility path for ForceGraph initialization and fallback behavior.

### How to verify
- Run `node --test tests/legacy-map-bootstrap.test.js tests/legacy-map-cdn-fallback.test.js`.
- Run `node --test tests/structure.test.js`.
- Run `node --test tests/*.test.js`.
