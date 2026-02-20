# M2 Animation Standard

This standard defines the minimum quality bar for mechanism animations in M2.
It keeps animation authoring consistent across contributors and makes reviews objective.

## 1) Fidelity Tiers

Each animation must be assigned one tier.

- Tier A (Template): Uses shared baseline path + marker motion + generic mechanism wording.
  - Use only as a temporary placeholder while coverage is being built.
- Tier B (Curated): Custom path and step sequence for one named mechanism family.
  - Default target for most production pathways in M2.
- Tier C (Exam-grade): Curated visual sequence plus explicit exam traps and route-selection context.
  - Required for highest-frequency exam pathways and showcase demos.

## 2) Visual Rules

- Keep `durationMs` between `2200` and `4200` for one full cycle.
- Use smooth continuous motion; avoid abrupt marker teleporting.
- Provide user speed control (at least slow/normal/fast) so learners can inspect steps.
- Keep animation readable on laptop screens and avoid very dense overlays.
- Show a minimal structural scaffold for curated mechanisms:
  - atoms and bonds must be visible so electron movement is anchored to structure.
- Show bond polarity when relevant:
  - Include dipole markers (`δ+` / `δ−`) on polarized bonds that drive mechanism choice.
- Show lone pair sources:
  - Lone pair locations on nucleophiles/hetero atoms must be visible before attack steps.
- Show electron movement explicitly:
  - Use curved-arrow style electron movement cues from lone pair/pi bond source to destination.
- Use consistent color roles:
  - path = mechanism flow
  - marker = electron/particle motion cue
  - text = step explanation
- Every animation entry must support fallback behavior in runtime if asset loading fails.

## 3) Pedagogy Rules

- Every animation must explain:
  - what transformation is occurring,
  - how the mechanism proceeds,
  - why this route is chosen in synthesis context.
- Step text must call out the mechanistic driver when applicable:
  - dipole attraction, lone pair donation, and electron movement direction.
- Include at least one exam-oriented warning for common mistakes where relevant.
- Avoid decorative animation that does not map to reaction logic.
- Step text should be short, direct, and revision-friendly.

## 4) Data Contract

Animation entries are resolved by `animationId` from map links.

Minimum required fields per animation entry:
- `id`: string, must match link `animationId`.
- `title`: short mechanism label.
- `summary`: one-sentence overview.
- `path`: SVG path string for marker motion.
- `durationMs`: integer cycle duration in milliseconds.
- `steps`: array of short mechanism steps (`steps.length >= 1`).

Required visual metadata for Tier B/C entries:
- `atoms`: atom scaffold entries (position + label) used in animation frame.
- `bonds`: bond scaffold entries connecting atom IDs.
- `electronMovement`: arrow descriptors that map electron movement source and target.
  - Optional `bend` factor (`0.5` to `4`) can be used to increase/decrease arrow curvature.
- `lonePairs`: locations of lone pair donors shown in the animation frame.
- `dipoles`: bond polarity markers used in mechanistic decision points.

Quality expectations:
- `steps` must be chemically meaningful and not placeholder filler in Tier B/C.
- Missing `animationId` or unknown registry key must trigger explicit fallback text.
- Curated atom coordinates must avoid atom-circle overlap at any step.
- Electron-flow arrows must be visibly curved (not nearly straight).

## 5) QA Gates

Automated gate:
- `tests/m2-animation-standard.test.js` must pass.
- `tests/m2-animation-visuals.test.js` must pass.

Manual acceptance checklist:
1. Open `/organic-map.html`.
2. Click a reaction link.
3. Click `Simulate Reaction`.
4. Confirm title/summary/step text is visible and matches the selected pathway.
5. Confirm play/pause, reset, and slider controls update the mechanism timeline correctly.
6. Confirm atom and bond scaffolds are visible and readable.
7. Confirm dipole markers are shown when polarity drives the step.
8. Confirm lone pair sources are visible before nucleophilic/electron donation.
9. Confirm electron movement arrows clearly show source and destination.
10. Confirm fallback text appears when an animation asset is intentionally unavailable.
11. Confirm speed control changes playback rate without breaking slider/play/pause behavior.

Regression expectations:
- Existing M1 metadata and map bootstrap tests must continue to pass.
- No removal of fallback behavior while adding curated animations.

## 6) Delivery Plan

Implement curated animations in parallel by mechanism family, not strictly one-by-one.

Recommended rollout batches:
1. Electrophilic addition family.
2. Nucleophilic substitution family.
3. Elimination/dehydration family.
4. Oxidation/reduction family.
5. Test-reaction mechanisms.

For each batch:
- Add or update registry entries.
- Run automated tests plus the manual acceptance checklist.
- Ship as a focused PR against `M2`.
