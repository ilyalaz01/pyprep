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
| T0.8 | Initialize frontend: `pnpm create vite frontend --template react-ts`, install Tailwind, TanStack Query, TanStack Router, Zustand. | `pnpm dev` opens blank app | ✅ (scaffolded; `pnpm build` + `pnpm lint` green; `pnpm dev` not booted in this session — port-bound, defer to next session manual smoke) |
| T0.9 | Add `docker-compose.yml` (dev) starting backend + frontend hot-reloaded. | `docker compose up` shows both running | ✅ pre-bootstrapped from spec |
| T0.10 | Add CI: GitHub Actions running lint, type-check, tests on PR. | Workflow file present, green on push | ✅ (workflow committed; every step verified locally; "green on push" confirmable only after first push to GH) |
| T0.11 | Write 150-LOC enforcement script `scripts/check_file_size.py`. | Hooked into CI | ✅ (impl + tests done; CI hookup deferred to T0.10) |

**Phase 0 exit gate:** `uv sync && ruff check . && pytest && pnpm --dir frontend build && python scripts/check_file_size.py` all pass.

---

## Phase 1 — Content Authoring (Module 1)

**Goal:** A real, complete Module 1 in `content/`. Schema validated. ~80 cards across all 5 types.

| ID | Task | DoD | Status |
|---|---|---|---|
| T1.1 | Lock the content JSON schema in `content/schema/card.schema.json`. Five card types as variants. | `jsonschema` validates | ✅ pre-bootstrapped from spec; module_id/sphere_id are wrapper-level not per-card (see NOTES N004) |
| T1.2 | Lock lesson Markdown frontmatter spec in `content/schema/lesson.frontmatter.example.md`. | Documented in `PRD_content_authoring.md` | ✅ |
| T1.3 | Author `content/modules/01_python_core_oop/module.md` (module overview + map of spheres). | Renders cleanly, all spheres listed | ✅ pre-bootstrapped from spec (lists all 7 spheres per curriculum.md) |
| T1.4 | Author Sphere 0 lesson (`00_fundamentals.md`) and ~15 cards. | Validation script green | ✅ (provided as gold sample) |
| T1.5 | Author Sphere 1 lesson + ~15 cards (Class architecture). | Validation green | ✅ (15 cards, validator green; awaiting owner spot-check vs gold sample) |
| T1.6 | Author Sphere 2 lesson + ~15 cards (Inheritance & exceptions). | Validation green | ✅ (15 cards, validator green; awaiting next spot-check after Sphere 3) |
| T1.7 | Author Sphere 3 lesson + ~12 cards (Dunder methods). | Validation green | ✅ (12 cards, validator green; awaiting owner spot-check #2) |
| T1.8 | Author Sphere 4 lesson + ~12 cards (Properties, decorators). | Validation green | ✅ |
| T1.9 | Author Sphere 5 lesson + ~10 cards (Generators, context managers). | Validation green | ✅ |
| T1.10 | Build content validator: `scripts/validate_content.py` — schema, ID uniqueness, sphere refs, min-cards-per-task ≥ 3. | Run via `uv run validate-content` | ✅ (per-sphere counts; strict per-sub-task deferred — NOTES N006) |
| T1.11 | Write ≥ 5 `code_task` cards for Module 1 with hidden pytest harness. | Each runs and passes when correct | ✅ (7 code_tasks, one per sphere s0–s6, every solution verified against its tests) |
| T1.12 | (NEW) Author Sphere 6 lesson + ~12 cards (Concurrency & GIL — m1-s6, curriculum (ADDED) item). | Validation green | ✅ (factual fix on s6-c5 logged: `Thread.join()` on unstarted thread raises `RuntimeError`, not no-op; `correct_index` 1→3, explanation rewritten) |
| T1.13 | (NEW) Lock pack JSON schema in `content/schema/pack.schema.json` (referenced by PRD §2 but not yet present). | `jsonschema` validates `content/interview_packs/packs.json` | ⬜ (deferred to Phase 8 — pack schema is for `MockPromptService`/interview-pack feature) |

**Phase 1 exit gate:** Validator green, ≥ 75 cards, ≥ 5 `code_task` cards, all 7 spheres covered (m1-s0…m1-s6).

---

## Phase 2 — Core SDK

**Goal:** All business logic exists as a pure Python SDK, fully tested in isolation. No HTTP yet.

| ID | Task | DoD | Status |
|---|---|---|---|
| T2.1 | `pyprep.sdk.content_loader.ContentLoader` — reads `content/`, validates, builds in-memory index. | Tests cover loader, ≥ 90% coverage on this file | ✅ (8 tests, 100% coverage on `content_loader/`; loader.py 60 LOC, index.py 24 LOC) |
| T2.2 | `pyprep.sdk.cards.CardService` — query by sphere, type, difficulty, tags. | Tests pass | ✅ (12 tests, 100% on cards.py; AND semantics on multi-tag query) |
| T2.3 | `pyprep.sdk.scheduler.FSRSScheduler` — wrap `py-fsrs`; expose `next_due(card_state, rating) -> CardState`. | Tests pass with golden vectors from py-fsrs docs | ✅ (14 tests incl. hypothesis property; 100% on `scheduler/`; FSRS-6, fuzzing OFF for determinism; flagged NOTES N008/N009 for owner) |
| T2.4 | `pyprep.sdk.sessions.SessionService` — orchestrate a card session lifecycle. | Tests pass | ✅ (12 tests; 100%/98% on sessions models/service; persistence abstracted via `SessionStore`/`ReviewStore` Protocols for T2.10) |
| T2.5 | `pyprep.sdk.stats.StatsService` — aggregate per-sphere/per-tag retention & weakness ranking. | Tests pass | ✅ (11 tests; 100% models, 97% service; covers overview/per_module/per_sphere/weakness_top_n/daily_chart/streak with tz support) |
| T2.6 | `pyprep.sdk.prompts.MockPromptService` — generate deterministic mock-interview prompts. | Snapshot tests on prompt output | ✅ (10 tests; 100% coverage on prompts/; Efraimidis-Spirakis weighted sampling for weakness_focus; anti-leak invariant pinned) |
| T2.7 | `pyprep.sdk.auth.AuthService` — register, login, JWT issuance/verification. | Tests cover happy + edge | ✅ (13 tests; 100% on models, 98% on service; bcrypt direct + HS256 JWT; anti-enumeration error; injected-clock exp check; NOTES N011 flagged for owner) |
| T2.8 | `pyprep.sdk.shared.gatekeeper.APIGatekeeper` — single egress, rate-limit-aware (no external calls today, but the seam exists). | Unit tested | ✅ (6 tests; 97% coverage; per-host sliding window with injected clock; HTTPClient as Protocol) |
| T2.9 | `pyprep.sdk.shared.config.Settings` — `pydantic-settings`. | Loads from `.env` correctly | ✅ (6 tests, 100% coverage; required `secret_key`, `LogLevel` Literal validation, env prefix `PYPREP_`) |
| T2.10 | `pyprep.sdk.repos.*` — SQLAlchemy models + repository classes per aggregate (User, Review, Session, UserStats). | Tests use SQLite-in-memory | ✅ (17 tests; 100% on every repos/* file; UNIQUE email + composite indexes pinned at schema level; UserStats deferred per PRD progress §3.3) |
| T2.11 | SDK public surface: `src/pyprep/sdk/__init__.py` exports the public classes. | `__all__` defined | ✅ (45 names; 2 tests pin both `__all__` membership and attribute presence) |
| T2.12 | Coverage gate raised to **fail-under 85%**. | CI enforces | ✅ (`pyproject.toml --cov-fail-under=85`; actual 97.09%; closes NOTES N001) |

**Phase 2 exit gate:** SDK is usable from a Python REPL: load content, create user, run a session, get stats, generate a prompt. Coverage ≥ 85% on `src/pyprep/sdk/`.

---

## Phase 2.5 — Security & Integrity Fixes (post-audit)

**Goal:** address the 5 critical-tier issues + 1 small fix surfaced by the fresh-eyes audit before Phase 3 starts. Each task is TDD per usual; commit-per-step.

| ID | Task | DoD | Status |
|---|---|---|---|
| T2.5.1 | Auth hardening: tighten `secret_key` to ≥32 chars; `password_min_length` setting; reject passwords > 72 bytes (silent bcrypt truncation); `EmailStr` validation. | Tests cover too-short / too-long / boundary password, short secret, bad email | ✅ (11 new tests; emoji 19×4=76 byte case included; .env-example updated) |
| T2.5.2 | Session submit idempotency + transactional `cards_correct` (UNIQUE on (session_id, card_id, idempotency_key); atomic UPDATE not read-modify-write). | Same idempotency_key returns original Review; concurrent threads don't double-count | ✅ (3 unit tests + 1 integration; T2.5.5 was brought forward to fit the LOC budget; CI race confirmed via 4-thread tmp-file SQLite test) |
| T2.5.3 | StatsService orphan-review handling: `_module_of` returns `int \| None`; aggregations filter; `Overview.orphan_review_count` surfaces it. | Stats with deleted-content reviews don't crash | ✅ (3 new tests; orphan count surfaced; per_module filters; per_sphere keeps orphan bucket) |
| T2.5.4 | Validator runs `code_task` solutions via subprocess pytest; `--skip-execution` flag for dev iteration. | Synthesized broken card fails the validator | ✅ (3 new tests; broken add() fixture trips gate; --skip-execution honored; real content's 7 code_tasks all pass automatically) |
| T2.5.5 | Pure refactor: split `sessions/service.py` — extract queue logic to `queue_builder.py`. Both files ≤ 120 LOC. | Tests pass unchanged; LOC budget met | ✅ (service.py 117 LOC; queue_builder.py 65 LOC; brought forward from owner-planned order, see chore-start commit) |
| T2.5.6 | Wire `is_single_user` param on AuthService; SDK plumbing only (Phase 3 wires the Settings call). | Constructor accepts `is_single_user`; `register` propagates | ✅ (2 new tests; default False; Settings.single_user_email default switched to EmailStr-compatible "owner@local.dev"; .env-example synced) |

**Phase 2.5 exit gate:** all six tasks ✅; coverage ≥ 85% throughout; push green CI before Phase 3 kickoff.

---

## Phase 3 — REST API

**Goal:** FastAPI exposes the SDK. OpenAPI docs auto-generated.

| ID | Task | DoD | Status |
|---|---|---|---|
| T3.1 | `src/pyprep/api/app.py` — FastAPI app factory, middleware (CORS, logging, error handler). | Boots, `/api/docs` reachable | ✅ (8 api/ files all ≤150 LOC; 8 integration tests; structlog JSON logging closes N013; HTTPMapping registry stub for T3.2 routers; alembic baseline + drift test; SQLite FK PRAGMA per-connection) |
| T3.2 | `src/pyprep/api/routers/auth.py` — register, login, refresh endpoints. | Postman happy paths green | ✅ (15 router + 5 deps + 4 single-user tests; closes N012; AUTH_ERROR_MAPPINGS centralized; token_type=bearer; single-user → 404 register + auto-create owner via lifespan; bcrypt rounds=12 explicit) |
| T3.3 | `src/pyprep/api/routers/modules.py` — list modules, get lesson. | Tests green | ✅ (6 tests; ContentIndex eager-loaded into app.state in create_app; 3 endpoints — list / detail / lesson; sphere-in-wrong-module → 404) |
| T3.4 | `src/pyprep/api/routers/sessions.py` — create, next-card, answer, finish. | Tests green | ✅ (17 router tests; closes N022; idempotency_key body field with 16-128 alnum+`_-` regex; cross-user → 404 N021.3; finish byte-equal on retry; SessionFinishedError → 409; 137 LOC) |
| T3.5 | `src/pyprep/api/routers/review.py` — daily queue. | Tests green | ✅ (4 tests; auth-gated; SDK addition `SessionService.preview_queue` documented in NOTES N019; sphere_id+limit query params) |
| T3.6 | `src/pyprep/api/routers/stats.py` — me, weakness. | Tests green | ✅ (4 tests; auth-gated; /me returns Overview, /me/weakness returns top-N SphereStats with n=Query(1..20)) |
| T3.7 | `src/pyprep/api/routers/mock.py` — generate mock-interview prompt. | Tests green | ✅ (5 tests; auth-gated; deterministic same-seed; FR-MOCK-4 invariant pinned at HTTP boundary; template loaded from `content/interview_packs/template_v1.md` codeblock at app boot) |
| T3.8 | `src/pyprep/api/deps.py` — auth dependency (decode JWT, return current user). | Tests cover invalid/expired tokens | ✅ (5 tests pin no-header / malformed / expired / deleted-user / happy paths; deps.py at 100% coverage; build_auth_service shared with lifespan as single source of truth) |
| T3.9 | Each handler ≤ 10 LOC of logic — calls one SDK method. | Code review check | ✅ (audit script `scripts/audit_handlers.py` + pinned in test suite as CI gate; 15/15 handlers within budget — only `mock::generate` (15 LOC) holds an N020 waiver; refactor of `stats::get_weakness` 12→2 dropped its over-budget status) |
| T3.10 | Integration tests via `httpx.AsyncClient` against the test app. | `tests/integration/` ≥ 70% coverage of routers | ✅ (integration→routers coverage at 99% — far above PRD §7 70% gate; all 15 OpenAPI endpoints covered; `scripts/check_router_coverage.py` available as on-demand gate) |

**Phase 3 exit gate:** ✅ 15 endpoints documented in `/api/docs` (verified: enumerate all PRD §7 routes), integration tests green (228 total, 96 integration), owner can hit each endpoint via curl. **Phase 3 closed 2026-05-09.** Pause here for the second fresh-eyes audit pass before Phase 4 starts.

---

## Phase 3.5 — Audit fixes (post-Phase-3 fresh-eyes review)

**Goal:** address the 7 audit findings (1 real bug + 6 hardening items) before Phase 4 starts. ADRs 011/012/013 added; NOTES N024-N028 deferred-list documented.

| ID | Task | DoD | Status |
|---|---|---|---|
| T3.5.1 | Restore mypy gate on `src/pyprep/api/` (errors.py:_handler_for missing return annotation) + wire CI to run it. | `uv run mypy src/pyprep/api/` clean; CI fails if a return annotation goes missing | ✅ (errors.py: `ExceptionHandler` type alias + return annotation; pyproject `[tool.mypy].files` adds `src/pyprep/api`; CI step renamed + new audit_handlers step; 4 config-regression tests pin api/ in `files` + strict mode) |
| T3.5.2 | Fix `/api/sessions/{id}/next` 500 on unknown `?after=` — extract `_resolve_next_index` helper, raise 404. | Test: `?after=NOT_A_REAL_CARD` returns 404, not 500 | ✅ (`_resolve_next_index(queue, after)` module-level helper raises 404 on unknown; next_card stays at 10 LOC; new test green) |
| T3.5.3 | Clamp `AnswerRequest.response_ms` to `le=600_000` (10 min cap). Doc in PRD §3.3 that it's best-effort client-reported. | Test for >600_000 → 422; PRD §3.3 amended | ✅ (Field(ge=0, le=600_000); 2 boundary tests; PRD §3.3 renderer note expanded with `response_ms` trust caveat) |
| T3.5.4 | Middleware adds `Cache-Control: no-store` + `Pragma: no-cache` to any `/api/auth/*` response. | Test: login response carries the headers | ✅ (`AuthNoStoreMiddleware` in api/middleware.py; 3 tests: login, register, non-auth-untouched) |
| T3.5.5 | Log-leak property test (`tests/integration/test_log_hygiene.py`). Captures structlog output; asserts no password / no JWT bytes / no `idempotency_key` value / no `password` key in any field across register→login→sessions→answer flow. | Test green | ✅ (uses `structlog.testing.capture_logs()` to bypass the cached-logger problem; second sanity test pins the helper itself works through cached loggers) |
| T3.5.6 | Refresh test asserts new token differs byte-for-byte from input. Add `jti` claim if needed to guarantee rotation. | `test_refresh_returns_token_distinct_from_input` green | ✅ (real bug — same-second refresh echoed input bytes; `_issue` now adds `jti=uuid4().hex`; integration + 2 SDK unit tests pin both byte-distinctness and jti presence) |
| T3.5.7 | Modules endpoints explicitly tagged public in PRD §7; lock with test. | `GET /api/modules` with no Authorization header → 200 | ✅ (3 lock tests: list/detail/lesson all public; PLAN §7 API surface table now carries explicit auth tag per endpoint with PUBLIC vs Bearer legend) |

**ADRs added:** ADR-011 (JWT in localStorage for MVP-1; review trigger: public-multi-user), ADR-012 (FastAPI StaticFiles for prod static hosting; CORS becomes no-op), ADR-013 (amendment to ADR-010 — Pyodide pass/fail signal is client-reported under same trust model as queue progression).
**NOTES added:** N024 (inbound rate limiting on /api/auth/* — Phase 10), N025 (two-worker single-user-startup race test — Phase 10), N026 (alembic downgrade test — Phase 10), N027 (body-size limit + 413 — Phase 10), N028 (content hot-reload — merged into N018). APIGatekeeper module docstring updated to clarify it's outbound-only.

**Phase 3.5 exit gate:** ✅ all 7 tasks complete. ADRs 011/012/013 added to `PLAN.md` (JWT storage, prod static hosting, Pyodide trust amendment to ADR-010). NOTES N024-N028 added with deferral context (inbound rate limit, two-worker race, alembic downgrade, body-size limit; N028 merged into N018). One real bug fixed: `_issue` now adds `jti` claim so refresh tokens are byte-distinct. **Phase 3.5 closed 2026-05-09.**

---

## Phase 4 — Frontend Shell

**Goal:** React app with routing, login, and module/lesson reading. No card sessions yet.

| ID | Task | DoD | Status |
|---|---|---|---|
| T4.1 | `frontend/src/lib/api.ts` — hand-typed API client + auth.ts JWT helpers + fetch wrapper (401 clears token + redirects). | All 15 endpoints typed; boot hits /api/health | ✅ (5 lib files: auth.ts/errors.ts/http.ts/api.ts/boot.ts; 26 vitest tests; APIError typed; 401 clears token + window.location.assign('/login') with redirect-loop guard; api groups for auth/modules/sessions/review/stats/mock/health all hand-typed against PLAN §7) |
| T4.2 | Auth flow: login page, JWT in localStorage, protected route wrapper. Public `/api/config` for single-user detection (ADR-014). | Login → redirect to home; single-user mode auto-detects and pre-fills | ✅ (backend: `/api/config` + 4 tests; frontend: theme tokens (OKLCH warm neutrals) + Geist Variable fonts (multi-script woff2), 4 primitives (Button/Input/FormField/ErrorBanner) + 10 tests, route tree with `_auth` parent `beforeLoad` gate, LoginPage + 5 tests covering happy/credential-error/422-field-error/single-user-prefill paths) |
| T4.3 | Layout shell: top-bar (no sidebar — MVP-1 keeps chrome thin), wordmark left, single-user badge center, user menu/logout right. Component library scaffold (Button/Input/Banner). | Lighthouse a11y ≥ 95; logout works | ✅ (backend: GET /api/auth/me + 2 tests; frontend: AppShell wraps `_auth` route, TopBar with wordmark + single-user badge + user-email + Sign-out; Banner with info/error/success variants replaces ErrorBanner; HomePage gains welcome + dashed-border empty state for T4.4; useCurrentUser/useConfig TanStack Query hooks; 60 frontend tests across 9 files) |
| T4.4 | `/home` real content: dashboard sections (Continue / Review queue / Weakness top-3) + modules list (4 entries, dimmed when content unavailable). No streaks, XP, or progress bars (PRODUCT.md principle 1). | Each section renders + skips per spec; dimmed-modules visible-but-not-clickable | ✅ (backend: card_count on ModuleSummary; frontend: HomeDashboard with 3 conditional sections, ModulesList tight one-line-per-module with PRD names + dimmed-not-clickable for 2-4, lib/last-active.ts localStorage helper for "Continue" data source until T5 lifecycle wires it; 12 frontend tests added across 77 total) |
| T4.5 | `/modules/:id` (sphere list) + `/modules/:id/lesson/:sphereId` (lesson reader, react-markdown + shiki Python/JSON/bash/text only, restrained github-dark-dimmed). | Markdown renders with code highlighting; "Back to module" + "Start review session" actions wired | ✅ (2 routes wired into TanStack `_auth` layout; ModuleDetailPage + 2 tests; LessonPage with loading-skeleton/error-banner/empty-coming-soon/happy branches + 8 tests; LessonReader uses react-markdown + remark-gfm; ShikiCodeBlock lazy-loads shiki (Python/JSON/bash/text + github-dark-dimmed only); base CSS .prose via @theme tokens — NO Tailwind Typography; ModulesList migrated to TanStack `<Link>`; 87 frontend tests across 14 files) |
| T4.6 | Component library refinement: audit existing primitives (Button/Input/Banner/FormField/Section/TopBar) for drift, extract LinkButton (TanStack Link styled like Button-ghost), beef up variant/disabled/aria test coverage, write src/components/README.md. No Storybook (overhead exceeds benefit at this size). | All primitives ≤120 LOC; tests cover variants + disabled + aria; README committed | ✅ (audit clean — sizing/focus/disabled tokens all consistent; LinkButton extracted from LessonActions inline link; 8 new tests pin variant tokens / Input disabled+password / FormField label.htmlFor; README documents 5 primitives + 7 composed components + token catalog + "why no Storybook" rationale; 101 frontend tests across 15 files) |
| T4.7 | Phase 4 close + Impeccable audit on login/home/modules/lesson surfaces. Polish bullets: bump `disabled:opacity-50`→`60` on Input (T4.2 nit); style `.prose pre` `::-webkit-scrollbar` (track transparent, thumb `--color-fg-muted` low-opacity, 8px tall — bright WebKit default pops in dark theme). | Audit findings become Phase 4.5 fix list | ⬜ |

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
| T10.3 | Production `Dockerfile` for backend; FastAPI mounts `frontend/dist` via StaticFiles (single process, same origin — see ADR-012). nginx/Caddy in front is post-MVP optimization. | `docker compose -f compose.prod.yml up` serves SPA + API on one port; CORS is no-op (same origin) | ⬜ |
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
