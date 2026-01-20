# A-Level Chemistry Interactive — Milestones, Feature Mapping, and QA Plan

## 0) Source verification status (CIE 9701 syllabus)

**Goal:** confirm the official CIE 9701 syllabus sections and map each to product features.

**Status:** external HTTP requests are still blocked in this environment (403 CONNECT tunnel failures), so the official syllabus PDF/page could not be fetched here.

**Verification attempts (commands):**
- `curl -L -I -A "Mozilla/5.0" https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-chemistry-9701/`
- `curl -L -I "https://papers.gceguide.com/A%20Levels/Chemistry%20(9701)/Syllabus/"`
- `curl -I https://example.com`

**Next step to fix the syllabus issue (two options):**
1. **Provide the syllabus PDF in-repo** (recommended): drop the official CIE 9701 syllabus PDF under `docs/syllabus/` so it can be referenced and parsed locally without outbound network access.
2. **Enable outbound access**: once available, update this section with the official link(s) and exact syllabus version/year.

**Local import checklist (when PDF is available):**
- Add the PDF to `docs/syllabus/` and include the filename + version here.
- Extract and list the official section headings as the canonical syllabus index.
- Replace the “Unverified mapping” note in Section 2 with confirmed section names.

---

## 1) Milestones (high-level product phases)

### M1 — Core Learning Surface
**Goal:** a usable learning map where each reaction/compound has structured knowledge, not just labels.
- Structured reaction/compound metadata (conditions, mechanism summary, exam tips).
- Side panel layout for fast scanning (What/How/Why/Exam tip).

### M2 — Interactive Understanding (Code-based Animation)
**Goal:** turn abstract concepts into controlled, readable animations (not video).
- SVG/Canvas/Three.js mechanism demos.
- Energy profile animations.
- Stereochemistry/3D manipulations.

### M3 — Recall & Quiz Layer
**Goal:** transform study into active recall.
- Quiz Mode (mask reagents/conditions/steps).
- Flashcard-style reveal.
- Predict-product and reagent-recall interactions.

### M4 — Game & Synthesis Path Challenges
**Goal:** path planning and exam-style synthesis skills.
- Start/end route challenges.
- Path validation (BFS or shortest path).
- Difficulty tiers and feedback.

### M5 — A2 Expansion (Full Coverage)
**Goal:** complete A2 content coverage with filtering by topic.
- Aromatics, nitrogen compounds, polymers, analytical chemistry.
- Topic/level tags (AS/A2) + filters.

### M6 — Output & Revision Pack
**Goal:** export/printable revision support.
- Cheatsheet / PDF export.
- Summary tables and checklists.

---

## 2) A-Level 9701 Knowledge Areas → Feature Mapping

> **Note:** This mapping uses the standard CIE 9701 syllabus structure (AS + A2). Confirm exact section names/ordering against the official PDF when external access is available.

### A) Physical Chemistry
| Syllabus Area | Knowledge Points (examples) | Best Feature Mapping |
|---|---|---|
| Atoms, moles, equations | moles, formulae, empirical/molecular | **Micro panel + Quiz Mode** (calculation prompts, formula recall) |
| Atomic structure | subatomic particles, isotopes, electronic configuration | **Micro panel + animated electron configuration** |
| Chemical bonding | ionic/covalent/metallic, shapes, polarity | **Micro panel + 3D model viewer** |
| States of matter | intermolecular forces, ideal gas | **Interactive sliders** (temperature/pressure effects) |
| Enthalpy changes | Hess cycles, bond energies | **Energy profile dynamic chart** |
| Reaction kinetics | rate graphs, activation energy | **Dynamic chart + particle collision sim** |
| Equilibria | Kc, Le Chatelier | **Interactive equilibrium slider + quiz** |
| Redox | oxidation numbers, redox titrations | **Side panel + redox step visualization** |
| Acid-base | pH, buffers, Ka/Kb | **Interactive titration curve + calculator** |

### B) Inorganic Chemistry
| Syllabus Area | Knowledge Points (examples) | Best Feature Mapping |
|---|---|---|
| Periodicity | trends, ionization energies | **Micro panel + trend charts** |
| Group 2 | reactivity, thermal stability | **Exam tips + reaction map** |
| Group 17 | displacement, halide tests | **Quiz + test reaction mapping** |
| Nitrogen & sulfur (and/or group trends) | ammonia, NOx, sulfuric acid | **Mechanism steps + industrial process diagrams** |
| Transition elements | complex ions, ligand exchange, redox | **3D coordination models + quiz** |

### C) Organic Chemistry
| Syllabus Area | Knowledge Points (examples) | Best Feature Mapping |
|---|---|---|
| Intro to organic | functional groups, isomerism | **Macro graph + 3D stereochemistry** |
| Hydrocarbons | alkanes/alkenes/aromatics | **Macro map + mechanism animation** |
| Halogenoalkanes | nucleophilic substitution | **Curly arrow SVG animation + quiz** |
| Alcohols | oxidation, dehydration | **Map + exam tips + reaction masking** |
| Carbonyls | aldehydes/ketones tests | **Test reaction cards + quiz** |
| Carboxylic acids & derivatives | esterification, hydrolysis | **Map + animated mechanism** |
| Nitrogen compounds | amines, amides, diazotisation | **Mechanism sequences** |
| Polymers | addition vs condensation | **Comparison panel + filtering** |

### D) Analysis & Practical Skills
| Syllabus Area | Knowledge Points (examples) | Best Feature Mapping |
|---|---|---|
| IR spectroscopy | functional group peaks | **Side panel spectral plot + quiz** |
| NMR spectroscopy | chemical shifts, splitting | **Interactive spectral overlay** |
| Mass spectrometry | molecular ion, fragments | **Animated fragmentation** |
| Qualitative analysis | test results + observations | **Exam tips + flashcards** |

---

## 3) Feature definitions (for consistent implementation)

### 3.1 Exam Tips
- **Purpose:** highlight the high-frequency or error-prone exam notes.
- **Data requirement:** `examTips` array on nodes/links.
- **UI:** icon + tooltip or highlighted card.

### 3.2 Quiz Mode
- **Purpose:** convert reactions into recall practice.
- **Data requirement:** `quizData` with `prompt`, `hiddenFields`, `answer`.
- **UI:** “Reveal” button and optional input check.

### 3.3 Mechanism Animation
- **Purpose:** teach electron flow & mechanism steps.
- **Data requirement:** `animationId` and assets registry.
- **UI:** embedded animation panel in side bar.

### 3.4 Synthesis Challenge
- **Purpose:** path planning and higher-order reasoning.
- **Data requirement:** `nodes/links` graph + BFS path validation.
- **UI:** multi-step selection with feedback.

---

## 4) Data model extensions (planned)

**Nodes**
- `level`: `AS` | `A2`
- `topic`: e.g. `Aromatics`, `Polymers`, `Analysis`
- `examTips`: string[]

**Links**
- `quizData`: `{ prompt, hiddenFields, answer }`
- `mechanismSteps`: string[]
- `animationId`: string

---

## 5) Data quality checks & regression plan

### 5.1 Required validation checks
- **Schema completeness:** every link has `label`, `type`, `reagents`.
- **Coverage:** every node is connected by at least one link (unless intentionally isolated).
- **Quiz coverage:** links tagged for Quiz Mode must contain `quizData`.
- **Animation coverage:** links with `animationId` must resolve to a registry entry.

### 5.2 Regression tests (expanded plan)
- Existing path tests remain (to avoid accidental deletion).
- Add tests for:
  - `quizData` structure where required.
  - No orphan nodes.
  - Level/topic tags present for A2 additions.

---

## 6) Documentation checklist for each milestone

When implementing each milestone, record:
1. **What changed** (data, UI, animation, tests).
2. **Why** (learning goal / syllabus coverage).
3. **How to verify** (manual steps + automated tests).

---

## 7) Next decisions (before task breakdown)

Pick the next focus:
- **Option A:** M1 — complete structured metadata + Exam Tips.
- **Option B:** M2 — first mechanism animation demo.
- **Option C:** M3 — Quiz Mode skeleton.
