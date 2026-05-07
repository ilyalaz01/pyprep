# PyPrep — TODO / Task Tracker

**Companion to:** `PRD.md`, `PLAN.md`
**Last updated:** 2026-05-07
**Status legend:** ⬜ not started · 🟡 in progress · ✅ done · ❌ blocked

---

## How to use this file (Claude Code rules)

1. Always work in **phase order**. Do not skip ahead. If a phase has unchecked items, finish them.
2. Inside a phase, you may parallelize independent tasks, but **commit per task** with the task ID in the message: `feat(p2): T2.4 implement FSRS scheduler`.
3. Every task ends with: green tests, zero `ruff` violations, no file > 150 LOC. If any check fails, you are not done.
4. **TDD is mandatory** for SDK code (`src/pyprep/sdk/`): write the failing test first, then implement.
5. Update this file (`docs/TODO.md`) at the start and end of each task — flip the status, add a one-line note if anything notable happened.
6. If you discover a task that should exist but is missing, **add it under the current phase with a `(NEW)` tag** rather than silently doing it.
7. When you finish a phase, run the **phase-end review checklist** (bottom of file) before moving on.

---

## Phase 0 — Skeleton & Tooling

**Goal:** A repo that builds, lints, tests (no real tests yet), and runs `pyprep --help` even though it does nothing.

| ID | Task | DoD | Status |
|---|---|---|---|
| T0.1 | Initialize `pyproject.toml` with project metadata, dependencies, dev-dependencies. Use `uv init`. | `uv sync` succeeds | ✅ pre-bootstrapped from spec; fixed `py-fsrs` → `fsrs>=6,<7` (see NOTES N002), pinned Python to 3.11 via `.python-version` (N003) |
| T0.2 | Configure `ruff.toml` with strict ruleset (`E`, `F`, `B`, `I`, `N`, `UP`, `SIM`, `RUF`). | `ruff check .` returns 0 | ✅ pre-bootstrapped from spec (config inline in `pyproject.toml [tool.ruff]`; verified `ruff check .` = 0) |
| T0.3 | Create `src/pyprep/__init__.py` with `__version__ = "1.00"`. | importable as `pyprep` | ✅ pre-bootstrapped from spec (`__version__` + `__all__` already present) |
| T0.4 | Create `src/pyprep/main.py` with a `main()` entry point printing version. | `python -m pyprep` prints version | ✅ |
| T0.5 | Create `tests/unit/test_smoke.py` with a single `test_version_string()` test. | `pytest` green | ✅ |
| T0.6 | Configure `pytest` (`pyproject.toml`): coverage settings, fail-under 85% (warn-only initially). | `pytest --cov` runs | ✅ pre-bootstrapped from spec; lowered `--cov-fail-under` 85→0, T2.12 re-raises to 85% (see NOTES N001) |
| T0.7 | Add `.env-example` with all envs documented; `.gitignore` covers `.env`, `__pycache__`, `.venv`, `*.db`. | Files present | ✅ pre-bootstrapped from spec |
| T0.8 | Initialize frontend: `pnpm create vite frontend --template react-ts`, install Tailwind, TanStack Query, TanStack Router, Zustand. | `pnpm dev` opens blank app | ⬜ |
| T0.9 | Add `docker-compose.yml` (dev) starting backend + frontend hot-reloaded. | `docker compose up` shows both running | ✅ pre-bootstrapped from spec |
| T0.10 | Add CI: GitHub Actions running lint, type-check, tests on PR. | Workflow file present, green on push | ⬜ |
| T0.11 | Write 150-LOC enforcement script `scripts/check_file_size.py`. | Hooked into CI | ⬜ |

**Phase 0 exit gate:** `uv sync && ruff check . && pytest && pnpm --dir frontend build && python scripts/check_file_size.py` all pass.

---

## Phase 1 — Content Authoring (Module 1)

**Goal:** A real, complete Module 1 in `content/`. Schema validated. ~80 cards across all 5 types.

| ID | Task | DoD | Status |
|---|---|---|---|
| T1.1 | Lock the content JSON schema in `content/schema/card.schema.json`. Five card types as variants. | `jsonschema` validates | ⬜ |
| T1.2 | Lock lesson Markdown frontmatter spec in `content/schema/lesson.frontmatter.md`. | Documented in `PRD_content_authoring.md` | ⬜ |
| T1.3 | Author `content/modules/01_python_core_oop/module.md` (module overview + map of spheres). | Renders cleanly, all spheres listed | ⬜ |
| T1.4 | Author Sphere 0 lesson (`00_fundamentals.md`) and ~15 cards. | Validation script green | ✅ (provided as gold sample) |
| T1.5 | Author Sphere 1 lesson + ~15 cards (Class architecture). | Validation green | ⬜ |
| T1.6 | Author Sphere 2 lesson + ~15 cards (Inheritance & exceptions). | Validation green | ⬜ |
| T1.7 | Author Sphere 3 lesson + ~12 cards (Dunder methods). | Validation green | ⬜ |
| T1.8 | Author Sphere 4 lesson + ~12 cards (Properties, decorators). | Validation green | ⬜ |
| T1.9 | Author Sphere 5 lesson + ~10 cards (Generators, context managers). | Validation green | ⬜ |
| T1.10 | Build content validator: `scripts/validate_content.py` — schema, ID uniqueness, sphere refs, min-cards-per-task ≥ 3. | Run via `uv run validate-content` | ⬜ |
| T1.11 | Write ≥ 5 `code_task` cards for Module 1 with hidden pytest harness. | Each runs and passes when correct | ⬜ |

**Phase 1 exit gate:** Validator green, ≥ 75 cards, ≥ 5 `code_task` cards, all 6 spheres covered.

---

## Phase 2 — Core SDK

**Goal:** All business logic exists as a pure Python SDK, fully tested in isolation. No HTTP yet.

| ID | Task | DoD | Status |
|---|---|---|---|
| T2.1 | `pyprep.sdk.content_loader.ContentLoader` — reads `content/`, validates, builds in-memory index. | Tests cover loader, ≥ 90% coverage on this file | ⬜ |
| T2.2 | `pyprep.sdk.cards.CardService` — query by sphere, type, difficulty, tags. | Tests pass | ⬜ |
| T2.3 | `pyprep.sdk.scheduler.FSRSScheduler` — wrap `py-fsrs`; expose `next_due(card_state, rating) -> CardState`. | Tests pass with golden vectors from py-fsrs docs | ⬜ |
| T2.4 | `pyprep.sdk.sessions.SessionService` — orchestrate a card session lifecycle. | Tests pass | ⬜ |
| T2.5 | `pyprep.sdk.stats.StatsService` — aggregate per-sphere/per-tag retention & weakness ranking. | Tests pass | ⬜ |
| T2.6 | `pyprep.sdk.prompts.MockPromptService` — generate deterministic mock-interview prompts. | Snapshot tests on prompt output | ⬜ |
| T2.7 | `pyprep.sdk.auth.AuthService` — register, login, JWT issuance/verification. | Tests cover happy + edge | ⬜ |
| T2.8 | `pyprep.sdk.shared.gatekeeper.APIGatekeeper` — single egress, rate-limit-aware (no external calls today, but the seam exists). | Unit tested | ⬜ |
| T2.9 | `pyprep.sdk.shared.config.Settings` — `pydantic-settings`. | Loads from `.env` correctly | ⬜ |
| T2.10 | `pyprep.sdk.repos.*` — SQLAlchemy models + repository classes per aggregate (User, Review, Session, UserStats). | Tests use SQLite-in-memory | ⬜ |
| T2.11 | SDK public surface: `src/pyprep/sdk/__init__.py` exports the public classes. | `__all__` defined | ⬜ |
| T2.12 | Coverage gate raised to **fail-under 85%**. | CI enforces | ⬜ |

**Phase 2 exit gate:** SDK is usable from a Python REPL: load content, create user, run a session, get stats, generate a prompt. Coverage ≥ 85% on `src/pyprep/sdk/`.

---

## Phase 3 — REST API

**Goal:** FastAPI exposes the SDK. OpenAPI docs auto-generated.

| ID | Task | DoD | Status |
|---|---|---|---|
| T3.1 | `src/pyprep/api/app.py` — FastAPI app factory, middleware (CORS, logging, error handler). | Boots, `/api/docs` reachable | ⬜ |
| T3.2 | `src/pyprep/api/routers/auth.py` — register, login, refresh endpoints. | Postman happy paths green | ⬜ |
| T3.3 | `src/pyprep/api/routers/modules.py` — list modules, get lesson. | Tests green | ⬜ |
| T3.4 | `src/pyprep/api/routers/sessions.py` — create, next-card, answer, finish. | Tests green | ⬜ |
| T3.5 | `src/pyprep/api/routers/review.py` — daily queue. | Tests green | ⬜ |
| T3.6 | `src/pyprep/api/routers/stats.py` — me, weakness. | Tests green | ⬜ |
| T3.7 | `src/pyprep/api/routers/mock.py` — generate mock-interview prompt. | Tests green | ⬜ |
| T3.8 | `src/pyprep/api/deps.py` — auth dependency (decode JWT, return current user). | Tests cover invalid/expired tokens | ⬜ |
| T3.9 | Each handler ≤ 10 LOC of logic — calls one SDK method. | Code review check | ⬜ |
| T3.10 | Integration tests via `httpx.AsyncClient` against the test app. | `tests/integration/` ≥ 70% coverage of routers | ⬜ |

**Phase 3 exit gate:** All endpoints documented in `/api/docs`, integration tests green, owner can hit each endpoint via curl.

---

## Phase 4 — Frontend Shell

**Goal:** React app with routing, login, and module/lesson reading. No card sessions yet.

| ID | Task | DoD | Status |
|---|---|---|---|
| T4.1 | `frontend/src/lib/api.ts` — typed API client (generated from OpenAPI or hand-written). | All endpoints accessible | ⬜ |
| T4.2 | Auth flow: login page, JWT in localStorage, protected route wrapper. | Login → redirect to home | ⬜ |
| T4.3 | Layout shell: sidebar nav, header with streak/XP widget, content area. | Lighthouse a11y ≥ 95 | ⬜ |
| T4.4 | `/home` route: greeting, "Review now" widget, top-3-weakness widget, recent activity. | Renders with stub data, then real | ⬜ |
| T4.5 | `/modules` and `/modules/:id` routes: module listing, sphere list, lesson reader. | Markdown renders with code highlighting | ⬜ |
| T4.6 | Reusable components in `frontend/src/components/`: `Button`, `Card`, `ProgressBar`, `Tag`. | Storybook-style demo page | ⬜ |
| T4.7 | Tailwind theme with named colors / spacing. No magic hex values in components. | Lint rule enforces | ⬜ |

**Phase 4 exit gate:** Owner can log in, browse modules, read a lesson with code blocks rendered.

---

## Phase 5 — Card Session UI

**Goal:** All five card types render and function. FSRS rating wired.

| ID | Task | DoD | Status |
|---|---|---|---|
| T5.1 | `/session/:sphereId` route + `useSession` hook (TanStack Query). | Loads session, fetches next card | ⬜ |
| T5.2 | `<FlipCard />` — front/back animation, rating buttons (Again/Hard/Good/Easy). | Rating posts to API, advances | ⬜ |
| T5.3 | `<CodeTrapCard />` — render Python with Prism/Shiki, multiple choice, post-answer explainer. | Works for Module 1 traps | ⬜ |
| T5.4 | `<MultipleChoiceCard />` — generic MC with per-option explanations. | Works | ⬜ |
| T5.5 | `<FillInCard />` — code with `___` blanks, input fields, tolerant validation. | Works | ⬜ |
| T5.6 | `<CodeTaskCard />` — Monaco editor, "Run tests" button (Phase 6 wires Pyodide). | Editor renders | ⬜ |
| T5.7 | Session summary screen: cards reviewed, accuracy, time, XP earned, next-due preview. | Shown after `finish` | ⬜ |
| T5.8 | Keyboard shortcuts: Space=flip, 1/2/3/4=rate, Enter=next. Documented in tooltip. | Manual QA pass | ⬜ |

**Phase 5 exit gate:** Owner completes a real 20-card session of mixed types and sees correct stats updates.

---

## Phase 6 — Pyodide Integration

**Goal:** Code-task cards execute in-browser, run hidden pytest, return results.

| ID | Task | DoD | Status |
|---|---|---|---|
| T6.1 | `frontend/src/pyodide/loader.ts` — lazy load Pyodide on first code-task route. | Loaded once per session, reused | ⬜ |
| T6.2 | `frontend/src/pyodide/runner.ts` — Web Worker wrapper, postMessage API. | Main thread non-blocked | ⬜ |
| T6.3 | `frontend/src/pyodide/pytest_runner.ts` — load `pytest` in Pyodide, run with provided harness. | Returns structured results | ⬜ |
| T6.4 | Wire `<CodeTaskCard />` to runner: user code + harness → run → display per-test pass/fail with diff for failures. | All Module 1 code tasks pass when answered correctly | ⬜ |
| T6.5 | Failure UX: show stderr, highlight failing assert with line. | Manual QA | ⬜ |
| T6.6 | Allowlist of safe modules in harness (stdlib subset). | Documented | ⬜ |

**Phase 6 exit gate:** Module 1 code tasks all run correctly in-browser. Lighthouse perf ≥ 80 on session route.

---

## Phase 7 — Stats & Weakness Dashboard

**Goal:** Per-module / per-sphere stats. Weakness ranking. No Duolingo shaming.

| ID | Task | DoD | Status |
|---|---|---|---|
| T7.1 | `/stats` route: overview cards (total reviews, retention, streak, XP). | Numbers match SDK output | ⬜ |
| T7.2 | Per-module breakdown table with retention bars. | Renders | ⬜ |
| T7.3 | Top-3-weakness widget: ranked spheres with "Practice now" CTA. | Sorted by weakness score | ⬜ |
| T7.4 | Streak counter: gentle copy, no guilt animations on break. | Manual review | ⬜ |
| T7.5 | Time-invested chart (per day, last 30 days). | Renders | ⬜ |

**Phase 7 exit gate:** Stats numerically match raw review history sampled manually.

---

## Phase 8 — Mock Interview Generator

**Goal:** Composable prompts that generate a high-quality external-LLM interview.

| ID | Task | DoD | Status |
|---|---|---|---|
| T8.1 | `/mock` route: filters (modules, spheres, difficulty, count, language EN/RU). | UI works | ⬜ |
| T8.2 | Prompt template v1 in `content/interview_packs/template_v1.md`. | Reviewed by owner | ⬜ |
| T8.3 | Prompt service samples cards per filter, fills template. | Same input → same output | ⬜ |
| T8.4 | Copy-to-clipboard with success toast. | Works in Chrome/Firefox/Safari | ⬜ |
| T8.5 | "How to use" panel: paste into Claude/ChatGPT, instruction tips. | Reviewed | ⬜ |
| T8.6 | 5 pre-curated prompt packs (e.g., "Junior Backend — Python Core", "QA Automation — Testing Heavy"). | Available on `/mock` page | ⬜ |
| T8.7 | Owner runs ≥ 3 real mock interviews, iterates on template based on output. | Notes added to ADR-005 | ⬜ |

**Phase 8 exit gate:** Owner runs a satisfying mock interview with a generated prompt and reports it caught real weaknesses.

---

## Phase 9 — Modules 2–4 Content

**Goal:** Full curriculum coverage.

| ID | Task | DoD | Status |
|---|---|---|---|
| T9.1 | Module 2 (Automation, Scripting, Infrastructure) — all spheres. | Validator green, ≥ 80 cards | ⬜ |
| T9.2 | Module 3 (Testing & QA) — all spheres. | Validator green, ≥ 60 cards | ⬜ |
| T9.3 | Module 4 (Linux, Docker, SQL, Git) — all spheres. | Validator green, ≥ 70 cards | ⬜ |
| T9.4 | Coverage check ≥ 95% sub-tasks × 3 cards. | Script confirms | ⬜ |
| T9.5 | Spot-check by owner: 20 random cards across modules for accuracy. | Owner sign-off | ⬜ |

**Phase 9 exit gate:** Coverage check green, owner-spot-check passed.

---

## Phase 10 — Polish & Deploy

**Goal:** Project is ship-ready and deployable by a third party.

| ID | Task | DoD | Status |
|---|---|---|---|
| T10.1 | Finalize `README.md` with screenshots, install, run, deploy. | Reads as a real product README | ⬜ |
| T10.2 | Take 6+ screenshots: home, module, lesson, each card type, stats, mock-interview screen. | In `assets/screenshots/` | ⬜ |
| T10.3 | Production `Dockerfile` for backend; static-built frontend served by nginx. | `docker compose -f compose.prod.yml up` works | ⬜ |
| T10.4 | Deploy guide for Fly.io OR a $5 VPS. | Followable end-to-end | ⬜ |
| T10.5 | License (MIT), Code of Conduct, CONTRIBUTING.md. | Files present | ⬜ |
| T10.6 | Lighthouse final pass: ≥ 90 perf, ≥ 95 a11y on all routes. | Report saved | ⬜ |
| T10.7 | Final coverage / lint / file-size check across whole repo. | All green | ⬜ |

**Phase 10 exit gate:** Segal §16 final-submission checklist 100% green.

---

## Phase-end Review Checklist (run before flipping a phase to ✅)

- [ ] All tasks in this phase ticked or explicitly deferred with note.
- [ ] `uv sync && ruff check . && pytest --cov` all green.
- [ ] No file in `src/` exceeds 150 LOC of code.
- [ ] No `print()` in production code (Segal §6.2).
- [ ] No secrets or hardcoded URLs in source.
- [ ] `docs/TODO.md` updated (this file).
- [ ] Commit history clean and readable.
- [ ] One quick "step back" — does the architecture still match `PLAN.md`? If not, **stop**, update `PLAN.md`, then resume.
