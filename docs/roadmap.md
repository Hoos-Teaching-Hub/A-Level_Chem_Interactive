# A-Level Chemistry Interactive — Milestones, Feature Mapping, and QA Plan

## 0) Source verification status (CIE 9701 syllabus)

**Goal:** confirm the official CIE 9701 syllabus sections and map each to product features.

**Status:** confirmed against the official Cambridge International AS & A Level Chemistry (9701) syllabus PDF for 2025–2027.

**Verification sources (commands):**
- `curl -L -I -A "Mozilla/5.0" https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-chemistry-9701/`
- `curl -L -A "Mozilla/5.0" -o docs/syllabus/9701-2025-2027-syllabus.pdf https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf`

**Local reference:**
- `docs/syllabus/9701-2025-2027-syllabus.pdf` (Version 1, published September 2022; use for exams in 2025–2027).

---

## 1) Milestones (high-level product phases)

### M0 — Infrastructure (Code-based Access, Data, Roles)
**Goal:** secure foundation for student progress tracking and teacher insights without email/third-party login.
- Code-based access flow (class code + student code + display name) with server-side hashing.
- Progress storage with row-level permissions (students can only read/write their own).
- Minimal teacher view with aggregated stats (coverage + weak topics).
- Role gating (students cannot access teacher-only views). Current frontend gating uses a session
  storage role flag (`chem.role`) to block teacher routes and UI while backend auth is pending.

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

## 1.1) Milestone integration checklist (detailed scope + QA)

| Milestone | Feature area | Scope | Success criteria | Dependency | QA check |
|---|---|---|---|---|---|
| M0 | Student account & progress | Auth system (register/login/reset), “My Progress” page, session refresh | Students can register/login/logout; “My Progress” loads | Backend choice (Supabase/Firebase) | New user can register/login/logout; refresh keeps session |
| M0 | Database & permissions | Progress tables + row-level permissions | Each student’s nodes/reactions/quizzes persist | Backend choice (Supabase/Firebase) | Permission test: A cannot read/write B |
| M0 | Teacher view (minimum) | Class stats (coverage + top weak points) | Teacher sees aggregated data without personal details | Backend choice (Supabase/Firebase) | Role gating: students cannot open teacher page |
| M1 | Data modeling | Nodes/Links extended: `level`, `topic`, `examTips`, `quizData`, `animationId` | Data structure stable & extensible | None | Schema check: required fields; no orphan nodes |
| M1 | Sidebar information architecture | Fixed What/How/Why/Exam Tip blocks | Node/edge click surfaces scan-friendly info | Data fields in place | Missing content falls back gracefully |
| M5 | A2 expansion — Aromatics | Benzene → derivatives + EAS chain | Aromatics backbone in map; A2 filter works | M1 data structure | Coverage check: A2 nodes have `topic`/`level` |
| M5 | A2 expansion — Nitrogen | Acyl chloride/amide/amino acid + diazotisation | A2 nitrogen routes connect cleanly | M1 data structure | Links correct; key conditions present |
| M5 | A2 expansion — Polymers | Condensation (polyester/polyamide) + UI distinction vs addition | UI clearly separates polymer types | M1 data structure | Filter works; tags consistent |
| M2 | Code-based animation | Curly arrows mechanism sample | Reusable animation player + registry | M1 `animationId` | Fallback if animation missing |
| M2 | Aromatics delocalisation | Big-π bond demo (Three.js) | Toggle/rotate/explain stability | Animation framework | Performance check on low-end devices |
| M3 | Quiz mode skeleton | Global toggle masks reagents/labels/conditions | Clicking link prompts question before reveal | M1 `quizData` | Missing quiz data skips quiz flow |
| M3 | Quiz types | Reagent recall + predict product + mechanism ordering | At least two types run end-to-end | Quiz skeleton | Scoring correct; attempt recorded |
| M4 | Path challenge | Start/end selection + student route build | Wrong step feedback + reward animation | Graph pathing | BFS/shortest path correct; no loops |
| M4 | Difficulty tiers | Topic/level/step auto-tiering | Easy/medium/hard generation | Path challenge | Reproducible; hints sensible |
| M6 | Cheatsheet/PDF | Auto-generate reaction list + common mistakes | One-click printable page/PDF | Data fields complete | Export complete; pagination ok; missing flagged |
| M6 | Past-paper linking | Link reactions/nodes to past paper tags | Sidebar shows prior exam references | Curated index | Links valid; year/question consistent |

---

## 2) A-Level 9701 Knowledge Areas → Feature Mapping

> **Confirmed:** Section names and numbering below match the official 2025–2027 syllabus content overview (AS topics 1–22, A Level topics 23–37).

### A) AS Level subject content (sections 1–22)
| Section | Official syllabus topic | Best feature mapping |
|---|---|---|
| 1 | Atomic structure | **Micro panel + animated electron configuration** |
| 2 | Atoms, molecules and stoichiometry | **Micro panel + Quiz Mode** (calculation prompts, formula recall) |
| 3 | Chemical bonding | **Micro panel + 3D model viewer** |
| 4 | States of matter | **Interactive sliders** (temperature/pressure effects) |
| 5 | Chemical energetics | **Energy profile dynamic chart** |
| 6 | Electrochemistry | **Redox step visualization + interactive cell diagram** |
| 7 | Equilibria | **Interactive equilibrium slider + quiz** |
| 8 | Reaction kinetics | **Dynamic chart + particle collision sim** |
| 9 | The Periodic Table: chemical periodicity | **Trend charts + compare tooltips** |
| 10 | Group 2 | **Exam tips + reaction map** |
| 11 | Group 17 | **Quiz + test reaction mapping** |
| 12 | Nitrogen and sulfur | **Industrial process diagrams + mechanism steps** |
| 13 | An introduction to AS Level organic chemistry | **Macro graph + 3D stereochemistry** |
| 14 | Hydrocarbons | **Macro map + mechanism animation** |
| 15 | Halogen compounds | **Curly arrow SVG animation + quiz** |
| 16 | Hydroxy compounds | **Reaction map + exam tips + masking** |
| 17 | Carbonyl compounds | **Test reaction cards + quiz** |
| 18 | Carboxylic acids and derivatives | **Map + animated mechanism** |
| 19 | Nitrogen compounds | **Mechanism sequences + flashcards** |
| 20 | Polymerisation | **Comparison panel + filtering** |
| 21 | Organic synthesis | **Synthesis challenge + reagent recall** |
| 22 | Analytical techniques | **Spectral panels + interactive overlays** |

### B) A Level subject content (sections 23–37)
| Section | Official syllabus topic | Best feature mapping |
|---|---|---|
| 23 | Chemical energetics | **Energy profile dynamic chart + advanced Hess cycles** |
| 24 | Electrochemistry | **Cell potential calculator + redox visualization** |
| 25 | Equilibria | **Le Chatelier sandbox + buffer/calculation drills** |
| 26 | Reaction kinetics | **Arrhenius plots + mechanism step animation** |
| 27 | Group 2 | **Comparative reactivity map + exam tips** |
| 28 | Chemistry of transition elements | **3D coordination models + ligand exchange sim** |
| 29 | An introduction to A Level organic chemistry | **Mechanism gallery + stereochemistry tools** |
| 30 | Hydrocarbons | **Multi-step mechanism animations + practice prompts** |
| 31 | Halogen compounds | **SN1/SN2/E1/E2 animation + quiz** |
| 32 | Hydroxy compounds | **Oxidation pathway map + reaction masking** |
| 33 | Carboxylic acids and derivatives | **Acylation pathway explorer + exam tips** |
| 34 | Nitrogen compounds | **Diazotisation sequence + recall mode** |
| 35 | Polymerisation | **Condensation vs addition comparison + filters** |
| 36 | Organic synthesis | **Route planning challenges + solution feedback** |
| 37 | Analytical techniques | **IR/NMR/MS overlays + qualitative analysis flashcards** |

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
  - Edge function session isolation (students cannot read/write each other's progress).

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

---

## 8) Code-based access & progress sync plan (detailed task list)

**Purpose:** align the upcoming implementation plan with the roadmap while keeping students anonymous (no email/SSO).

### 8.0 Recommended stack profile (minimal vs. scalable)
**Goal:** keep M0 delivery fast while providing a clear path to scale.

| Layer | Minimal (ship fast) | Scalable (upgrade path) | Rationale |
|---|---|---|---|
| State for progress/sync | LocalStorage + TanStack Query | Add Zustand for sync/status UI | Minimal is enough for MVP; Zustand makes sync status simpler as features grow. |
| Offline storage | LocalStorage only | Add IndexedDB (`idb-keyval`) | IndexedDB protects against localStorage size limits when activity state expands. |
| Forms | Controlled inputs | React Hook Form + Zod resolver | Adds validation + error UX without much overhead. |
| API client | Fetch wrapper (timeout/retry) | Shared request/response helpers + typed errors | Keeps edge-function errors consistent across UI. |
| Edge Functions | Shared utils (hashing/validation/errors) | Add rate-limit table + structured logging | Start minimal, then add durability & ops visibility. |

### 8.1 Task breakdown mapped to M0
| Task | Scope | Output artifacts | Dependencies | Definition of done |
|---|---|---|---|---|
| **T1. Frontend skeleton** | Vite + React + TS + Router + Query + Zod + Tailwind; `/student` + `/teacher` routes; join/login forms; API client placeholder | `src/` routes, base UI components, `api.ts`, README update | None | `npm run dev` works; form submissions log payloads |
| **T2. DB schema + migrations** | Tables: `classes`, `students`, `sessions`, `progress`, plus teacher auth (hash) | `supabase/migrations/*`, seed script, README update | Supabase CLI | Migrations apply cleanly locally |
| **T3. Edge Functions** | `join`, `load`, `save`, `teacher/report` with Zod validation, hashing, and basic rate limit | `supabase/functions/*`, Deno tests, README update | T2 | Functions run locally; curl examples return expected data |
| **T4. Offline-first sync** | Local-first save, background sync, conflict resolution by `updated_at`, teacher code in sessionStorage | `src/api.ts`, storage utils, Query cache | T1 + T3 | Offline progress preserved; sync succeeds when online |
| **T5. Student MVP** | Activity list + activity page; status bar; sync states | `src/student/*`, mock activities | T4 | Cross-device join sees same progress |
| **T6. Teacher dashboard** | Stats, leaderboard, activity distribution, CSV export, search | `src/teacher/*` | T3 | Data renders and exports |
| **T7. Deployment guide** | Env vars, Supabase CLI commands, pre-launch checklist | README update | T2 + T3 | New dev can deploy in ~30 minutes |

### 8.2 Reasonableness assessment (per task)
1. **T1 — Frontend skeleton:** Highly reasonable. The stack is standard and low-risk; it unblocks parallel backend work. Risk is minimal and mostly about consistent project structure.
2. **T2 — DB schema + migrations:** Reasonable and necessary. Hash-only storage for student codes and sessions is appropriate. Risk: future schema changes if activity model evolves; mitigate with clear migration strategy.
3. **T3 — Edge Functions:** Reasonable and secure. Service-role-only access is correct for write paths. Main risk is rate limiting and token expiry; implement minimum viable throttling and keep responses consistent for the UI.
4. **T4 — Offline-first sync:** Reasonable but medium complexity. Risks include conflict resolution edge cases and perceived delays; mitigate with a simple `updated_at` winner rule plus clear UI status.
5. **T5 — Student MVP:** Reasonable. Using mock activities keeps scope contained and validates end-to-end sync quickly.
6. **T6 — Teacher dashboard:** Reasonable. The report endpoint should aggregate in SQL for performance; avoid heavy client-side aggregation for large classes.
7. **T7 — Deployment guide:** Reasonable and often overlooked. Clear env var documentation prevents configuration errors, especially around salts and teacher codes.

### 8.3 Alignment to roadmap milestones
- **M0:** Covered by T1–T4 plus the minimal teacher report (T6).
- **M1–M6:** After M0 is stable, proceed with the knowledge graph, quizzes, and animations as already defined above.
