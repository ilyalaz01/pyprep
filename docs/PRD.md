# PyPrep — Product Requirements Document (PRD)

**Version:** 1.00
**Owner:** Ilya Lazarev
**Status:** Approved for development
**Last updated:** 2026-05-07

---

## 1. Project Overview & Context

### 1.1 The Problem

The Israeli junior Python market is broken. Companies post "junior" or "student" positions but expect candidates to already have 1–2 years of production experience. In the AI era, most CS graduates can build features by directing LLMs but cannot write working code on a blank page from memory. Hiring managers know this and now use technical interviews specifically to filter for candidates who can:

- Write clean Python from memory, no autocomplete and no AI.
- Reason out loud about runtime behavior, edge cases, and design choices.
- Handle the operational tail: regex, file I/O, requests, datetime, subprocess, logging, testing, Docker, basic SQL.
- Demonstrate testing discipline (`pytest`, fixtures, mocking, coverage).

The gap between "I can build with AI" and "I can pass a 1-hour live interview" is wide and growing. Generic Python tutorials, LeetCode, and classroom material do not close it.

### 1.2 The Product

**PyPrep** is a single-purpose web application designed to take a candidate from "I broadly understand Python" to "I can pass a junior-to-mid Python technical interview" in 4–6 weeks of focused daily use. It is not a tutorial site, not a Duolingo clone, and not a LeetCode replacement. It is a **focused Python interview prep platform** built around four pillars:

1. **Curated topical content** mapped to real Israeli junior Python interview content (4 modules, ~25 spheres, ~80 sub-tasks).
2. **Active recall via flip cards and code traps** with spaced repetition (FSRS algorithm).
3. **In-browser interactive code tasks** validated by `pytest` (via Pyodide) — no signup, no backend execution, no security risk.
4. **Mock interview mode** that generates ready-to-paste prompts for an external LLM (Claude/ChatGPT in the browser), letting the user run unlimited mock interviews using their existing chat subscription rather than paying per-token.

The platform is built first for the project owner (Ilya), then shaped into a public tool other Israeli CS students can register for.

### 1.3 Target Audience

Primary persona: **CS / Software Engineering graduate or final-year student in Israel**, aged 22–28, fluent in Hebrew/Russian/English, currently job-searching for a junior or student Python position (Backend, Automation, AI Integration, QA Automation). Has degree-level CS knowledge but weak interview muscle. Spends 1–3 hours/day on prep.

Secondary persona: **mid-career engineer pivoting to Python** from another language (Java, C++) who needs to fill Python-specific syntax gaps fast.

### 1.4 Market Context

Free or partial competitors exist (Anki, LeetCode, RealPython, HackerRank, CodeSignal). None of them combine: (a) Israeli-junior-aligned content, (b) flip-card spaced repetition, (c) in-browser pytest validation, (d) external-LLM mock interview generator. PyPrep occupies that intersection.

---

## 2. Goals & KPIs

### 2.1 Project Goals

- **G1:** Owner passes a real Python technical interview within 8 weeks of consistent daily use (≥45 min/day).
- **G2:** Cover 100% of Modules 1–4 from the source curriculum (`content/curriculum.md`) with at least 3 cards per sub-task.
- **G3:** Ship a deployable, public web app that another CS student can use without owner intervention.
- **G4:** Project itself becomes a portfolio asset — a deployed full-stack web app with documentation, tests, and CI signals strong enough to be referenced on the owner's CV.

### 2.2 Key Performance Indicators

| KPI | Target | Measurement |
|---|---|---|
| Curriculum coverage | ≥ 95% of sub-tasks have ≥ 3 cards | Build-time check on `content/` |
| Card review accuracy | Owner ≥ 80% on second-attempt cards | Per-user stats, reviewed weekly |
| Daily active streak (owner) | ≥ 30 days unbroken | App-tracked |
| Code task pass rate | Owner ≥ 70% first attempt by Module 4 | Per-user stats |
| Test coverage of source | ≥ 85% (per Segal §16.3) | `pytest --cov` |
| Linter violations | 0 | `ruff check` |
| File size violations | 0 files > 150 LOC | Custom script |
| Lighthouse score (frontend) | ≥ 90 perf, ≥ 95 a11y | CI |
| Time to first contentful paint | ≤ 1.5s on local | Lighthouse |

### 2.3 Acceptance Criteria

PyPrep is **shippable** when **all** of the following hold:

1. Owner can register, log in, complete a full session of 20 cards across mixed types, and see updated stats.
2. All 4 modules are populated with ≥ 250 cards total covering the curriculum.
3. At least 30 cards are interactive code tasks executable in-browser via Pyodide.
4. At least 5 mock-interview prompt packs are generatable and copyable to clipboard.
5. Stats dashboard shows per-module and per-sphere weakness ranking.
6. App is deployable as a single container via `docker build -t pyprep:latest . && docker run -p 8000:8000 ...` (full guide: `docs/DEPLOY.md`).
7. All MANDATORY documents under Segal §1 exist and are current.
8. Test coverage ≥ 85%, `ruff check` returns zero violations, no file exceeds 150 LOC.

---

## 3. Functional Requirements

### 3.1 Content System (FR-CONTENT)

- **FR-CONTENT-1:** Hierarchical content tree: Module → Sphere → Task → Card. Encoded as Markdown lessons + JSON card files.
- **FR-CONTENT-2:** Cards support five types: `flip`, `code_trap`, `multiple_choice`, `fill_in`, `code_task`.
- **FR-CONTENT-3:** Each card has stable ID, difficulty (1–5), tags, source citation, optional code snippet, optional `pytest` validation harness.
- **FR-CONTENT-4:** Lessons are Markdown with embedded code blocks, rendered with syntax highlighting and "open in card" inline links to relevant cards.
- **FR-CONTENT-5:** Content is loaded at server start from `content/` directory, cached in memory, reloaded on file change in dev mode.

### 3.2 Learn Mode (FR-LEARN)

- **FR-LEARN-1:** Per-module landing page with sphere overview, progress bar, "Start lesson" / "Practice" actions.
- **FR-LEARN-2:** Lesson view renders Markdown with collapsible sections and progress through the lesson tracked.
- **FR-LEARN-3:** "Start cards" button transitions from lesson into card session for that sphere.

### 3.3 Card Session (FR-CARD)

- **FR-CARD-1:** Flip card: question side → user thinks → reveal answer → user self-rates (Again / Hard / Good / Easy) per FSRS.
- **FR-CARD-2:** Code trap: render Python snippet with syntax highlighting, ask "what does this print?", multiple-choice from plausible distractors, then explain.
- **FR-CARD-3:** Multiple choice: 4 options, exactly one correct, explanations for each option (especially why wrong ones are wrong).
- **FR-CARD-4:** Fill-in: render code with `___` blanks, user types missing tokens, validate exact match against tolerant regex.
- **FR-CARD-5:** Code task: editable code editor with Pyodide, hidden `pytest` harness, "Run tests" button, real-time test result feedback.
- **FR-CARD-6:** All card outcomes feed into FSRS scheduler and per-sphere/per-tag stats.

> **Renderer note:** "Hidden" answer fields (`tests`, `solution_code`,
> `correct_index`, flip-card backs) are masked by the UI but reach the
> browser on the wire — see `PRD_code_sandbox.md` §3.1 (Visibility
> model) for the full architectural trade-off. Renderers MUST mask;
> they MUST NOT assume server-side redaction.
>
> **`response_ms` trust note:** The per-answer `response_ms` field is
> client-reported and clamped server-side at 0–600_000 ms (10 min cap;
> rejected at the Pydantic boundary). Treat it as best-effort — clock
> skew, paused tabs, and client tampering all corrupt it. Suitable for
> "rough latency" displays; NOT suitable as a primary stat or as input
> to scheduler weighting. (T3.5.3.)

### 3.4 Smart Review (FR-REVIEW)

- **FR-REVIEW-1:** Daily review queue assembled by FSRS — due cards prioritized by retrievability, then difficulty, then sphere weakness.
- **FR-REVIEW-2:** "Review now" home action surfaces today's queue size.
- **FR-REVIEW-3:** Cards rated `Again` re-enter queue at end of session. **Client-side responsibility** (per PLAN ADR-010): the server records each rating event independently as a `Review` row; the SPA owns queue ordering and the re-insertion of AGAIN-rated cards.
- **FR-REVIEW-4:** New cards introduced gradually — daily new-card cap configurable, default 15.

### 3.5 Stats & Weakness Detection (FR-STATS)

- **FR-STATS-1:** Per-user persistent stats: per card, per task, per sphere, per module, per tag.
- **FR-STATS-2:** "Weakness dashboard" ranks spheres by inverse retention × volume, highlights top 3 weakest.
- **FR-STATS-3:** Streak counter, total cards reviewed, total time invested.
- **FR-STATS-4:** XP awarded per card by difficulty, displayed but **not shamed** if streak breaks. Streak resets silently — no Duolingo-style guilt UI.

### 3.6 Mock Interview Mode (FR-MOCK)

- **FR-MOCK-1:** User selects modules / spheres / difficulty band → app generates a long-form interview prompt referencing those topics.
- **FR-MOCK-2:** Prompt instructs the external LLM to act as a senior interviewer, ask questions one at a time, demand verbal explanation, push on weak answers, and produce a debrief at the end.
- **FR-MOCK-3:** Prompt is shown on screen with a "Copy to clipboard" action and a "How to use" panel ("Paste into Claude/ChatGPT, treat the LLM as the interviewer").
- **FR-MOCK-4:** Prompts are deterministic — same selection produces same prompt, except for an optional randomized question order seed.
- **FR-MOCK-5:** No paid API calls anywhere in this flow.

### 3.7 Authentication & Multi-User (FR-AUTH)

- **FR-AUTH-1:** Simple email/password registration with bcrypt-hashed passwords.
- **FR-AUTH-2:** JWT-based session, 7-day expiry, refresh on activity.
- **FR-AUTH-3:** Single-user mode: if env var `PYPREP_SINGLE_USER=true`, skip registration, auto-login as configured user. Default for owner's local install.
- **FR-AUTH-4:** Public profile (post-MVP): user can opt-in to share progress badges on a public URL.

### 3.8 Admin / Authoring (FR-ADMIN)

- **FR-ADMIN-1:** Content edits go through file system — no DB content edits at MVP. Authors edit Markdown / JSON, restart or hot-reload.
- **FR-ADMIN-2:** Validation script confirms every card has required fields, no duplicate IDs, all referenced spheres exist.
- **FR-ADMIN-3:** Content build script outputs total card count per module/sphere/type — surfaced in CI.

---

## 4. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-PERF-1 | Card load p95 ≤ 200 ms on local dev |
| NFR-PERF-2 | Initial page load ≤ 1.5s TTFCP |
| NFR-SEC-1 | All secrets via `.env`, never in code (Segal §11) |
| NFR-SEC-2 | Passwords bcrypt-hashed, JWT secret per-deployment |
| NFR-SEC-3 | Pyodide-only code execution — no server-side `exec` of user code, ever |
| NFR-A11Y-1 | All flows keyboard-navigable, ARIA labels on cards |
| NFR-I18N-1 | UI strings extractable for future RU/HE localization (no hardcoded user-facing English in components) |
| NFR-OBS-1 | Structured JSON logs, log levels configurable via env |
| NFR-PORT-1 | Runs as a `docker run` container on Linux/macOS hosts; Windows via WSL or Docker Desktop |

---

## 5. Out of Scope (Non-Goals)

- ❌ Server-side Python execution of user code. Pyodide-only. Ever.
- ❌ Algorithmic / LeetCode-style problems. User uses LeetCode separately.
- ❌ Video lessons. Text + code only.
- ❌ Real-time multiplayer features.
- ❌ Mobile-first UI in MVP. Responsive but desktop-primary.
- ❌ Payment system. Free tool.
- ❌ Email delivery, marketing flows, social login.
- ❌ Per-token AI calls inside the product (mock interviews use external chat-LLM via copy-paste prompt).

---

## 6. Assumptions, Dependencies & Constraints

### 6.1 Assumptions

- Owner has a Claude or ChatGPT subscription for running mock-interview prompts.
- Users have evergreen browsers with WASM support (for Pyodide).
- Source curriculum (4 modules) is the authoritative content scope; new modules are post-MVP.

### 6.2 Dependencies

- Python 3.11+ for backend.
- `uv` as the only package manager (Segal §16.4).
- Node 20+ for frontend build.
- Pyodide CDN for code execution.
- `fsrs` (PyPI; GitHub repo: open-spaced-repetition/py-fsrs) for spaced repetition algorithm.

### 6.3 Constraints

- Every code file ≤ 150 LOC (Segal §2.2).
- All business logic accessible through SDK layer (Segal §3).
- Test coverage ≥ 85% (Segal §16.3).
- Zero `ruff check` violations.

---

## 7. Timeline & Milestones

This timeline assumes Claude Code does the bulk of the implementation, with the owner reviewing and steering. Wall-clock time is short because the project is built by an AI agent with the owner as architect/reviewer; effort is real and scoped per phase.

| Phase | Deliverable | Defines done when |
|---|---|---|
| **0. Skeleton** | Project layout, configs, empty modules pass `ruff` and `pytest` (no real tests yet) | `uv sync && pytest && ruff check` all green |
| **1. Content authoring** | Module 1 fully authored (~80 cards, all 5 types represented) | Validation script passes for Module 1 |
| **2. Backend SDK** | Cards, sessions, FSRS scheduler, stats — all callable via SDK | Full SDK test suite passes ≥ 85% coverage |
| **3. REST API** | FastAPI exposes SDK; OpenAPI documented; auth working | Postman collection green |
| **4. Frontend shell** | React app, routing, login, module listing, lesson reader | User can log in and view a lesson |
| **5. Card session UI** | All five card types render and function; FSRS rating wired | Owner can complete a 20-card session |
| **6. Pyodide integration** | Code tasks run pytest in-browser, results displayed | All Module 1 code tasks pass when answered correctly |
| **7. Stats & weakness dashboard** | Per-module / per-sphere stats, weakness ranking | Stats match raw card history |
| **8. Mock interview generator** | Prompt packs for all 4 modules, copy-to-clipboard works | Owner runs a real mock interview using a generated prompt |
| **9. Modules 2–4 content** | Full curriculum coverage | Coverage check ≥ 95% sub-tasks × 3 cards |
| **10. Polish & deploy** | Production `Dockerfile`, README finalized, screenshots, deploy guide | `docker build` + `docker run` produces a working app on a fresh machine (see `docs/DEPLOY.md`) |

Phases 0–8 form **MVP-1 (private, owner-only)**. Phases 9–10 form **MVP-2 (public-ready)**.

---

## 8. Out-of-Project Items (Done by the Human)

The owner (not the AI agent) is responsible for:
- Approving each PRD before development begins.
- Reviewing pull-request-equivalent code chunks at the end of each phase.
- Final mock-interview LLM testing and feedback on prompt quality.
- Domain registration and production hosting (post-MVP).
- Marketing / sharing if going public.

---

## 9. References

- Segal Software Project Guidelines v3.00 (project-root authority document).
- Curriculum source: `content/curriculum.md` (modules 1–4 derived from owner's interview-prep plan).
- FSRS specification: <https://github.com/open-spaced-repetition/fsrs4anki/wiki>.
- Pyodide: <https://pyodide.org>.

---

**Sign-off:** Ilya Lazarev, 2026-05-07 — Approved for development per Segal §1.5.
