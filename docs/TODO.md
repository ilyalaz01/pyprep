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
| T1.13 | (NEW) Lock pack JSON schema in `content/schema/pack.schema.json` (referenced by PRD §2 but not yet present). | `jsonschema` validates `content/interview_packs/packs.json` | ⬜ (deferred — pack schema tied to Mock Interview Generator, removed from roadmap per ADR-028; revive only if interview-pack feature is re-prioritized) |

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
| T4.7 | Phase 4 close + Impeccable audit on login/home/modules/lesson surfaces. Polish bullets: bump `disabled:opacity-50`→`60` on Input (T4.2 nit); style `.prose pre` `::-webkit-scrollbar` (track transparent, thumb `--color-fg-muted` low-opacity, 8px tall — bright WebKit default pops in dark theme). | Audit findings become Phase 4.5 fix list | ✅ (T4.7.1a Input disabled opacity 50→60 with token-pinning test; T4.7.1b `.prose pre` WebKit scrollbar tamed (8px, transparent track, fg-muted/30% thumb via color-mix) + first CSS-asserting test in suite (`index.css.test.ts`); T4.7.2 Impeccable audit on all 4 surfaces against PRODUCT.md/DESIGN.md + shared laws + product reference — Audit Health Score **16/20 (Good)**, 0 P0 / 2 P1 / 6 P2 / 8 P3, anti-patterns verdict PASS (no AI slop); audit report delivered raw in chat for owner triage into Phase 4.5; 105 frontend tests across 16 files) |

**Phase 4 exit gate:** ✅ Owner can log in, browse modules, read a lesson with code blocks rendered. 105 frontend tests green, ruff/mypy/eslint/tsc clean, Impeccable audit returned 16/20 (Good) with 0 blocking findings. **Phase 4 closed 2026-05-10.** Pause here for owner review of the T4.7.2 audit report; findings triaged into Phase 4.5 before Phase 5 starts.

---

## Phase 4.5 — Audit fixes (post-T4.7.2 Impeccable audit triage)

**Goal:** address the 9 audit findings owner triaged from the 16 total (2 P1 + 4 P2 + 3 P3). Systemic fixes (contrast gate, ESLint guard, content lint) land first to prevent regression; tactical fixes follow. P3 items deferred to Phase 10 polish recorded in N030.

| ID | Task | DoD | Status |
|---|---|---|---|
| T4.5.1 | Light-mode `--color-fg-subtle` 0.62→0.50 + dark 0.56→0.62 (headroom). `scripts/check-contrast.mjs` asserts WCAG AA on token pairings (fg / fg-muted / fg-subtle vs bg / bg-elevated, both modes). Wire to pre-push hook. | Script fails when contrast drops; deliberate-fail test passes; CI gate green | ✅ (12 pairings × both themes = 24 assertions; all clear AA. Audit said `--color-fg-subtle` was borderline; the gate's actual math was worse — dark 4.04/3.72, light 3.44/3.15. Bumps fixed all four. Pure-Node OKLCH→OKLab→linear sRGB→WCAG converter, no deps. Deliberate-fail verified the gate fires.) |
| T4.5.2 | `Input.describedBy` prop; `FormField` wires `errorId`. Same commit replaces `title=` tooltip on disabled "Start review session" with visible inline note. | Test asserts `<input aria-describedby>` matches `<p id="...-error">` when error present; disabled-button visible note renders | ✅ (no Input prop change needed — FormField clones the child with `aria-describedby={errorId}` since Input already spreads `...rest`. LessonActions empty-cards state shows a `basis-full` inline note instead of the title tooltip; keyboard- and touch-users can read it.) |
| T4.5.3 | Replace 1 of 4 `window.location.href` with `<Link>` (HomeDashboard Continue). LessonPage:100 swap to `LinkButton`. Mark Review-now + Start-review with `// TODO(phase-5):` (route doesn't exist yet). ESLint `no-restricted-syntax` rule forbidding `window.location.href` in `pages/`/`components/` with allow-list comments. | Lint fails on deliberate reintroduction; 2 TODO sites have explicit allow comments | ✅ (Continue → TanStack `<Link>`, Back-to-module → `LinkButton`, Review-now + Start-review keep TODO + `eslint-disable-next-line` inline. ESLint AST selector matches the assignment exactly; deliberate-fail verified. HomeDashboard.test.tsx wraps in a memory router for the new `<Link>`.) |
| T4.5.4 | Three em dashes → punctuation (LoginPage:50, :67, HomeDashboard:81). `scripts/check-em-dash.mjs` greps user-facing copy for U+2014. | Lint fails on deliberate reintroduction; copy reads clean | ✅ (3 hits → 3 fixes. Subtitle "PyPrep — Python interview prep" simplified to "Python interview prep." since wordmark above already says PyPrep. Lint walks `frontend/src/**/*.{ts,tsx}` excluding `*.test.*`, strips comments before grepping. 29 files clean.) |
| T4.5.5 | Extract `MODULE_NAMES` → `lib/module-names.ts`. Import in `ModulesList` + `ModuleDetailPage`. ModuleDetail h1 = MODULE_NAMES[id]; eyebrow stays "MODULE 1". | h1 reads "Python Core & OOP" not "Module 1"; both surfaces tested | ✅ (one `lib/module-names.ts` source of truth; ModuleDetail h1 carries the human label per the new "Address-vs-Label Rule" in DESIGN.md.) |
| T4.5.6 | Backend: `SphereSummary.lesson_title` from `ContentLoader.LessonMeta`. Frontend: ModuleDetail sphere rows + HomeDashboard weakness list show `lesson_title` prominent + `sphere_id` as `text-xs` caption. | Backend integration test asserts field; frontend tests assert both elements render | ✅ (SphereSummary + SphereStatsResponse both gain `lesson_title`. `get_weakness` injects ContentIndex via Depends and looks up the title; handler stays at 2 LOC of logic, audit clean. Frontend rows: title primary, sphere_id mono caption beneath, falls back to sphere_id alone when title is null. min-w-0 + truncate so long titles don't shove the meta out.) |
| T4.5.7 | One commit, 4 TODOs: Shiki dark-permanent comment + blockquote carve-out comment + login error multi-user TODO + Shiki XSS multi-user TODO. | Comments present at correct line; no behavior change | ✅ (comment-only — the implicit decisions are now explicit at the source. The Shiki dark-permanent comment is also cited in DESIGN.md §5 Components.) |
| T4.5.8 | `--ease-out-quart: cubic-bezier(0.16, 1, 0.3, 1)` in `@theme`. Apply `ease-(--ease-out-quart)` to Button/LinkButton/Input. | Tests pin the easing class in className for all 3 primitives | ✅ (Tailwind v4 arbitrary easing syntax `ease-(--ease-out-quart)`. ShikiCodeBlock/Banner/Section/FormField don't animate so they're untouched. 3 new tests pin the class on each primitive — guard against a future Tailwind sweep silently swapping back to ease-in-out.) |
| T4.5.9 | Run `/impeccable document` to regenerate DESIGN.md from current code reality (token names, primitive list, composed components, anti-pattern carve-outs). | DESIGN.md no longer marked "seeded starter"; matches shipped tokens | ✅ (Google Stitch DESIGN.md format: YAML frontmatter + 6 fixed sections + .impeccable/design.json sidecar. Creative North Star: "The Peer's Notebook". 9 named rules across colors/typography/elevation. Phase 4.5 guardrails (em-dash lint, contrast gate, ESLint window.location guard) appear in the Don'ts. 8 components in the sidecar with self-contained ds-* HTML/CSS for the live panel.) |

**N030 — Phase-10 polish deferrals (from T4.7.2 audit):**
- P3.4 `<Section>` accessible name (judgment call, low impact — implicit h2 naming acceptable)
- P3.6 Sphere/module row touch targets at 44px line (desktop-only, mobile out of scope per PRD §5)
- P3.8 Geist Mono ~50KB for one CSS rule (premature; brand commitment justifies cost)
- P3.9 HomePage `<section>` semantic redundancy with AppShell `<main>` (cosmetic)

**Phase 4.5 exit gate:** ✅ all 9 tasks complete; CI green (ruff / mypy / eslint / tsc / contrast / em-dash / pytest / vitest / handler-LOC / file-size); regenerated DESIGN.md captures shipped state in Stitch format with `.impeccable/design.json` sidecar. 113 frontend tests across 16 files; backend 230+ tests. Audit re-run skipped — diff between the T4.7.2 audit findings and shipped state IS the changelog (2 P1 fixed via contrast gate + aria-describedby; 4 P2 fixed via SPA-nav sweep, em-dash lint, MODULE_NAMES extraction, lesson_title surfacing; 3 P3 captured as documentation TODOs; 4 P3 deferred per N030). **Phase 4.5 closed 2026-05-10.** Pause for owner direction; do NOT auto-roll into Phase 5.

---

## Phase 5 — Card Session UI

**Goal:** All five card types render and function. FSRS rating wired. Session lifecycle (start → loop → finish → summary). Keyboard map.

12-task breakdown (supplants the older 8-task list owner approved at Phase 5 entry). ADRs filed mid-phase: 015 (self-rate on objective cards), 016 (`key={card.id}` per-card React isolation), 017 (nested route + no MVP resumption). Editor framework: CodeMirror 6 (Monaco rejected — IntelliSense undermines learning).

| ID | Task | DoD | Status |
|---|---|---|---|
| T5.1 | `lib/session-queue.ts` — pure client-side queue, ADR-010 client-owned progression, AGAIN re-insertion. | Pure module, no React, no network | ✅ (`bd6bede`) |
| T5.2 | `lib/use-session.ts` — hook wiring queue to /api/sessions/*, NextCard cache for AGAIN re-presentations, idempotency keys, response_ms clamp. | Status machine loading→active→finishing→finished; AGAIN's cached re-present produces distinct idempotency keys per attempt | ✅ (`b8a77bf`) |
| T5.3 | `<RatingBar />` — 4-button cluster, token-pinned outcome colors (Anki convention), digit captions. | Click forwards rating; disabled-prop blocks; aria-labels carry digit | ✅ (`84054f9`) |
| T5.4 | `lib/card-types.ts` — discriminated union + Zod parser. Five card shapes typed against authored content. | parseCard validates and narrows on `type` discriminator | ✅ |
| T5.5 | `<FlipCard />` — front/back crossfade reveal (NOT 3D rotation per DESIGN.md), self-rate handed to RatingBar. | Pre-reveal masks answer; reveal animates; rating advances | ✅ |
| T5.6 | `<MultipleChoiceCard />` — generic MC with per-option explanations, ADR-015 self-rate after submit. | Submit shows correct/incorrect + per-option explanations; rating loop runs | ✅ |
| T5.7 | `<CodeTrapCard />` — Python snippet via Shiki, multiple-choice answer, post-answer explainer. | Module 1 trap cards render with correct highlighting | ✅ (`d9b9074`) |
| T5.8 | `<FillInCard />` — code-with-`___`-blanks renderer, per-blank inputs, match-blank policy. | Multi-blank inputs validated against `accepted_answers[][]`; remediation surfaces; Enter-on-last-blank submits | ✅ (`96d554f`) |
| T5.9 | `<CodeTaskCard />` + CodeMirror 6 editor + Pyodide runner stub. | Editor renders Python with starter code; Run wires to runner.ts stub (Phase 6 swaps in real Pyodide) | ✅ (`0240673`) |
| T5.10 | `SessionPage` + `CardRenderer` dispatch + home/lesson "Review" rewiring. | Loading skeleton, error+Retry, two empty-states, active CardShell+renderer, finished placeholder. Default `mode='mixed'` (review-due first, top up with new) — was `'review'` which returned empty for users with no Reviews yet. | ✅ (`5aa59f3`, fix `da3f613`) |
| T5.10.5 | Polish round from owner browser re-test: replace per-button rating captions with single info-icon + tooltip (extracted as `<RatingHelp />`), drop pre-engagement DifficultyMeter from CardShell header (read as a progress indicator + primes against ADR-015), aggressive +4px-on-base typography re-bump for high-DPI legibility. NOTES backlog N031–N035 filed. | Pre-push gates green; owner re-verifies in browser | ✅ (`19f4c78`, `dd7a72c`, `5abc82f`, `5f70ddd`, `74a9805`, `4d21a77`, `2ed06dc`, `47e3d30`) |
| T5.11 | `<SessionSummary />` — calm reporting at session end. Cards reviewed · time invested (wall-clock M min Ss) · per-rating breakdown · accuracy on objective card types only (rating ≥ 3) · next-due preview bucketed by ≤1d / 1-3d / 3-7d / >7d. CTAs: Back to module + Practice again. NO XP, NO streaks, NO celebratory copy. | All sections render; accuracy row omitted when no objective cards; empty buckets omitted; aggregation is client-side from `AnswerResult.next_due_at` (latest-wins per card on AGAIN-then-rerate) | ✅ (`6c6ef56`) |
| T5.12 | Global keyboard map (`useSessionKeys` hook): Space → reveal (flip cards), 1-4 → rate, Esc → confirm + exit. Visible cheatsheet footer in session, hidden on summary. Editable-target gate so per-card local bindings (CodeMirror, FillIn Enter) don't conflict. | Keys fire via DOM click on the matching affordance (respects disabled state); pre-reveal digit press is no-op; Esc with confirm-yes navigates back to module | ✅ (`3d9dbf4`) |

**Phase 5 exit gate:** code-complete and CI-green. All 8 pre-push gates green: ruff / mypy / file-size (≤150 LOC) / handler-LOC (≤10) / eslint / tsc / contrast (WCAG AA) / em-dash. Test counts at close: vitest ~280 tests across ~25 files; pytest ~230 tests. **Manual exit gate (owner runs a real 20-card mixed-types session against `m1-s0` end-to-end and verifies stats updates) is PENDING owner re-test** — that's an owner action; auto-roll into Phase 6 only after owner confirms. **Phase 5 code-closed 2026-05-11.**

---

## Phase 6 — Pyodide Integration

**Goal:** Code-task cards execute in-browser, run hidden pytest, return results.

| ID | Task | DoD | Status |
|---|---|---|---|
| T6.0 | Pre-flight ADRs: worker lifecycle (ADR-018), CDN sourcing + cold-start budget (ADR-020), pytest sourcing + adapter (ADR-021). | Filed in PLAN.md | ✅ |
| T6.1 | `frontend/src/pyodide/loader.ts` — singleton worker boot with cold-start metrics. | Loaded once per session, reused | ✅ (T6.1–T6.3 commits; stop-#2 handshake diagnostics + stop-#3 self-bootstrap fix landed mid-task) |
| T6.2 | `frontend/src/pyodide/worker.ts` — top-level self-bootstrapping worker (Pyodide load + pytest load + harness install + 'ready' emit). | Main thread non-blocked | ✅ |
| T6.3 | Cold-start instrumentation (`getColdStartMetrics()`); stop-#2 owner verification under cold/warm caches. | 3 segment timings + total reported | ✅ |
| T6.4 | `pytest_harness.py` — Python-side runner + worker install via `?raw`. | Returns structured RunResult | ✅ |
| T6.5 | `runner.ts` worker-driven path + namespace reset (FR-SBX-6). | Per-task isolation by construction | ✅ |
| T6.6 | `<CodeTaskCard />` wired to runner; per-test pass/fail UI; RatingBar after success. | All Module 1 code tasks pass when answered correctly | ✅ |
| T6.7 | Allowlist enforcement — static AST extraction (ADR-019 amended after stop #3). | Hidden denied imports return clean ImportError | ✅ |
| T6.8 | Timeout + worker-crash recovery via `invalidateWorker`. | `while True: pass` recovers cleanly | ✅ |
| T6.9 | Input validation per PRD §7.1 (≤50KB code, timeout bounds). | Oversized paste rejected before worker boot | ✅ |
| T6.10 | Module 1 code_task smoke matrix (CPython-side, parametrized). | Every authored solution_code passes its own tests | ✅ (gap to Pyodide-actual filed as N037 → Phase 10) |
| T6.11.0 | Shiki core-bundle polish — drop full-bundle lang pull. | Bundle 10.15 MB → 1.29 MB raw | ✅ |
| T6.11 | Pre-push bundle-size gate (ADR-022) + CI-only cold-start gate (ADR-020 amended 8s→12s; N036 resolved). | Pre-push gates 8 → 9; cold-start runs in CI | ✅ |
| T6.12 | Allowlist smoke matrix (parameterized over 7 cards × allow/deny). | Both sides of the gate verified per-card | ✅ |

**Phase 6 exit gate:** Module 1 code tasks all run correctly in-browser. Lighthouse perf ≥ 80 on session route. **Phase 6 code-closed 2026-05-12.** Owner-led stops #1–#4 all verified green (smoke / fail-path / allowlist / timeout / input-validation). Lighthouse pass deferred to owner's exit-gate session; not a code blocker.

**Phase 6 close summary (2026-05-12):**
- 13 task IDs across 13 commits (T6.0 pre-flight ADRs through T6.12 matrix).
- New ADRs filed: ADR-018, ADR-019, ADR-020, ADR-021, ADR-022 (5).
- NOTES filed in-phase: N036 (DevTools throttle vs Worker fetch — resolved T6.11), N037 (Pyodide-actual coverage gap — Phase 10).
- Pre-push gates: 8 → 9 (bundle size added; cold-start CI-only).
- Test counts at close: vitest ~280 (unchanged), pytest 299 (+15 from T6.12 matrix), Playwright 1 (cold-start CI gate).
- Bundle: 10.15 MB raw / 2.06 MB gzip → 1.29 MB raw / 391 KB gzip (post-T6.11.0).
- Cold-start ceiling: 12s (CI gate, ADR-020 amended).

---

## Phase 6.5 — Audit fixes (post-Phase-6 independent audit triage)

**Goal:** address the 6 audit findings owner triaged from the independent Phase 5+6 audit (4 P1 + 2 P2; 5 P3 + remaining P2s deferred). Each task TDD where applicable; commit per task; ADR-024 filed; one auditor measurement mistake (P1-1) caught during pre-flight and re-scoped to a doc clarification.

| ID | Task | DoD | Status |
|---|---|---|---|
| P6.5/P1-1 | Clarify PRD §5.2 + Acceptance Criterion 6: 150-LOC ceiling is **code-LOC** per `scripts/check_file_size.py` (non-blank, non-comment), not raw `wc -l`. Audit had counted raw lines (worker.ts 174, pytest_harness.py 153); gate-counted values are 137 and 116 — both well under the ceiling. No ADR-023 filed (the "violation" wasn't one). | PRD §5.2 + §9 amended; file-size gate stays green | ✅ (`12f1b1f`) |
| P6.5/P2-1 | Strip stop-driven `console.*` diagnostics from shipped code. CodeTaskCard.tsx:56 (stop-#2 useEffect log) and loader.ts:40/45 (boot-called, singleton-hit) removed. loader.ts:59/81 (worker diagnostic forwarder + cold-start metrics emission) wrapped in `import.meta.env.DEV`. worker.ts:146/171 (env-not-set + top-level boot-fail console.error) kept — both fire only on unrecoverable paths and are user/owner actionable. | All 333 vitest tests still green; no production console noise on happy path | ✅ (`61f4649`) |
| P6.5/P2-2 | Card-transition focus management. Each card-type renderer focuses its primary actionable element on mount via `useEffect` + ref: FlipCard → Reveal button · MC/CodeTrap → first option · FillIn → first blank · CodeTask → editor (via new `CodeMirrorEditor.autoFocus` prop calling `view.focus()` in production, autoFocus HTML attr in the jsdom mock). Button now accepts a `ref` prop (React 19 native). Combined with `key={card.id}` (ADR-016), keyboard-only users no longer get dropped to body between cards. | New `card-transition-focus.test.tsx`: 7 tests pin focus per card type + 2 transition paths (same-type id change, cross-type transition). All green. | ✅ (`18496d2`) |
| P6.5/P1-4 | Mid-session error recovery contract pinned. Current behavior (Retry = fresh-session via SessionPage's retryKey remount, queue not persisted) was implicit in ADR-010 + ADR-017; ADR-024 makes it explicit. New `use-session-error-recovery.test.ts`: 3 tests pin /answer 500 → error, /next 500 → error, and re-rendering useSession after unmount fires a second POST /api/sessions (the regression alarm if a future change adds resumption). | ADR-024 filed; tests green; future resumption work has a clear flip-the-test contract | ✅ (`b5b3496`) |
| P6.5/P1-3 | Realistic cold-start workload + NFR-SBX-2 hot-path gate. Replaced trivial `def add` with m1-s1-c12 (Date.from_string) Module 1 code_task verbatim — 3 tests, `import pytest`, classmethod constructor + subclass-instance check. Fixture also runs 2 subsequent in-session calls; spec asserts cold ≤ 12 s (ADR-020 unchanged — workload swap stays inside existing 2.3 s headroom over owner baseline) AND max(subsequent) ≤ 1.5 s (NFR-SBX-2 + 500 ms CI variance headroom). Separate `expect()` calls so failures point at the right gate. | ADR-020 amended with P6.5/P1-3 sub-section; CI gate count 1 → 2 (still one Playwright file); pre-push unchanged | ✅ (`c0cd655`) |
| P6.5/P1-2 | Real-Pyodide e2e Playwright spec — resolves N037. New `pyodide-e2e-fixture.ts` + `pyodide-e2e.html` (third Vite build entry, CI-only) + `pyodide-e2e.spec.ts` (serial mode, shared page so the ~10 s boot is amortized across ~22 cases). Drives T6.10 (every Module 1 code_task's solution_code passes its own tests in real Pyodide), T6.12 (per-card allow + deny matrices in real Pyodide), and FR-SBX-6 (task A defines `foo`; task B without `foo` must fail — regression alarm for sys.modules leakage). | N037 closed; pyodide-actual coverage gap removed before Phase 7 | ✅ (`799aab0`) |

**Phase 6.5 close summary (2026-05-12):**
- 6 audit-fix task IDs across 6 commits (P6.5/P1-1 through P6.5/P1-2), plus 5 CI-rollout fix-up commits (gitignore, job rename, webServer timeout bump, host/stdout instrumentation, env-var injection), plus one content-fix commit (m1-s6-c11 reclass — see below).
- New ADRs filed: ADR-024 (mid-session error recovery — Retry = fresh-session, queue not persisted). ADR-023 was the originally-triaged 150-LOC carve-out; **not filed** because P1-1 pre-flight showed the audit had miscounted raw lines and the gate was already green. PRD clarified instead.
- New NOTES: **N038** (Vite env vars are build-time, not runtime — CI must inject; lesson from the CI rollout; Phase 10 gate candidate filed). **N039** (Phase 1 content may have Pyodide-vs-CPython divergences — first surfaced by T6.12 on m1-s6-c11; full Module 1 audit recommended before Phase 8 Module 2 authoring). **N037 resolved** by P6.5/P1-2.
- Pre-push gates: 9 (unchanged). CI gates: 1 → 2 Playwright specs (cold-start now gates two budgets + new e2e spec).
- Test counts at close: vitest 35 → 37 files, 333 → 343 tests (+7 card-transition focus, +3 mid-session error recovery, +3 from P1-4 file split). Pytest 299 (unchanged; T6.12 matrix automatically picks up 6 instead of 7 code_tasks after m1-s6-c11 reclass, no test code change). Playwright 1 → 2 specs (cold-start + e2e); e2e contributes 1 sanity + 6 T6.10 + 6 T6.12-allow + 6 T6.12-deny + 1 FR-SBX-6 = 20 cases (down from 23 since m1-s6-c11 no longer in code_task set).
- Bundle: 1.29 MB raw / 391 KB gzip → 1.29 MB raw / 391.9 KB gzip (e2e entry adds 0.1 KB raw / 0.6 KB gzip, well inside ceiling).
- Cold-start ceiling: 12 s (unchanged; measured at 3.5 s on first green CI run). NFR-SBX-2 ceiling: 1.5 s (new; measured at 82 ms on first green run). Both budgets have substantial headroom.
- **Content fix surfaced by T6.12** (not a Phase 6 architecture issue): card `m1-s6-c11` (asyncio.gather doubler) was authored in Phase 1 against CPython semantics — its hidden tests use `asyncio.run(...)` from sync `def test_` functions, which Pyodide's always-running JS event loop rejects with `RuntimeError`. Reclassified `code_task` → `code_trap` in the same Phase 6.5 commit: the canonical `asyncio.gather` pattern is now the trap's code_snippet, MC tests understanding of return order + return type. Pedagogy preserved; runtime conflict removed by not asking the harness to execute Pyodide-hostile code. **N039 filed** for a Phase 10 audit of all remaining code_tasks for similar divergences (asyncio, threading, subprocess, network primitives) before Phase 8 Module 2 authoring.
- **Owner action:** push remains the path. CI will exercise the new Playwright e2e spec (`pnpm exec playwright install chromium` is the local prereq, same as T6.11). Lighthouse pass on session route still pending (owner action; not a code blocker).

---

## Phase 7 — Stats & Weakness Dashboard

**Goal:** `/stats` page with overview, per-module breakdown, 30-day chart, and weakness widget. Plus the N031 "Practice anyway" override and N034 MC option shuffle. No Duolingo shaming.

The original 5-task scaffold (T7.1-T7.5 — overview / per-module / weakness / streak / chart) was expanded after the Phase 7 planning chat to 10 tasks: backend extension, route scaffold, four UI components, two backlog roll-ins, and the close. Three stop points held: time-invested signal validation, anti-Duolingo compliance on rendered tiles, chart aesthetic gate. One bug discovered at stop point #2 (rating-as-proxy accuracy) triggered an out-of-band fix chain (3 commits) that landed before T7.6 started.

| ID | Task | DoD | Status |
|---|---|---|---|
| T7.1 | Extend `Overview.total_seconds` via session wall-clock (ADR-027). `StatsRepository.list_finished_sessions` + service aggregation + `OverviewResponse` + frontend type. **Owner stop point #1** validated the wall-clock signal against a real session before any UI built on it. | Owner sees honest "time invested" matching their internal sense | ✅ (`fb0c6f4`) |
| T7.2 | `GET /api/stats/me/per-module` + `GET /api/stats/me/daily?days=30`. Thin wrappers over existing SDK methods (`per_module`, `daily_chart`). | New endpoints documented in PLAN §7; 6 integration tests | ✅ (`6d1d764`) |
| T7.3 | Frontend types + api client (`api.stats.perModule`, `api.stats.daily`). Split `api.stats.test.ts` from `api.test.ts` to stay under 150-LOC gate. | api.test 14 + api.stats.test 6 tests; tsc green | ✅ (`7ff007b`) |
| T7.4 | `/stats` route scaffold + 4-branch state machine (loading skeleton, error+Retry, empty calm "Stats appear here..." CTA, ready placeholder). Empty state was owner-clarified must-design — anti-AI-slop discipline pinned by test guards. | 6 state-machine tests + route registered prod+fixture | ✅ (`d8cb546`) |
| T7.5 | `<OverviewCards />` — 5 tiles initially (reviews, accuracy, time, streak, XP). Reduced to 4 at P7-fix (Accuracy tile dropped per N040). Anti-Duolingo discipline pinned by 25+ regression guards. **Owner stop point #2** validated tile framing. | Owner browser pass on neutral streak + restrained XP framing | ✅ (`63ac65b`) |
| P7-fix | Stop point #2 surfaced misleading 100% accuracy. SessionSummary accuracy → in-memory outcome; Accuracy tile dropped from /stats; N040 filed. Outcome plumbing through `onRate(rating, outcome?)` across 4 objective card types. **Owner stop point #2 retry** validated honest 20% accuracy on a session with deliberate wrong-answer + Good rating. | Per-session accuracy honest; aggregate slot empty pending N040 backend work | ✅ (`ddc65a1`, `b7a5820`, `b641e48`) |
| T7.6 | `<PerModuleTable />` — one row per PyPrep module, ModulesList aesthetic (divide-y, dimmed inert rows, hairline retention bar). | 9 tests; loading/error/empty/ready + anti-Duolingo guards | ✅ (`ea75a6b`) |
| T7.7 | `<DailyChart />` — hand-rolled SVG, 30 bars + per-7-day labels + tooltips + 1px baseline for zero days (ADR-025). Reversibility clause in ADR for fallback to Recharts. **Owner stop point #3** validated chart aesthetic — ADR-025 unamended. | 11 tests including anti-Duolingo (monochrome bars, no shame copy); ADR-025 Accepted | ✅ (`fb07438`) |
| T7.8 | Extract `<WeaknessWidget />` from `HomeDashboard`. Shared between /home (gated ≥10 reviews) and /stats (always shown). | 12 widget standalone tests + 10 existing HomeDashboard tests unchanged | ✅ (`7a1fc90`) |
| T7.9 | N031 "Practice anyway" override + ADR-026. `build_queue` gains `override_daily_cap` param; `StartRequest` field; SessionPage reads `?practice=true` query param. Reviews persist normally per ADR-026 (FSRS absorbs dense revisits). | 3 SDK + 2 API + 4 frontend tests; ADR-026 Accepted | ✅ (`5436cd2`) |
| T7.10 | N034 MC option shuffle on AGAIN. `SessionQueue.attemptCount(cardId)` increments on AGAIN re-insertion; `seeded-shuffle.ts` deterministic Fisher-Yates; MC + CodeTrap shuffle on attempt>0. Correctness preserved via `data-original-index` mapping. | 4 new shuffle tests; correct-answer-after-shuffle pinned | ✅ (`916068d`) |
| T7.11 | Phase 7 close — TODO.md summary, CI green, owner push of full chain. | All 9 pre-push gates green; vitest 47 files / 431 tests; pytest 305+ | ✅ (this entry) |

**Phase 7 exit gate:** Stats surface complete end-to-end. /stats renders OverviewCards + PerModuleTable + DailyChart + WeaknessWidget with honest framing throughout. N031 (Practice anyway) and N034 (MC shuffle) closed. N040 (cross-session accuracy backend) deferred with clear restoration path.

**Phase 7 close summary (2026-05-12):**
- 11 task IDs across 14 commits (T7.1-T7.10 + 3-commit P7-fix chain + T7.11 close).
- New ADRs filed: ADR-025 (hand-rolled SVG chart, reversible), ADR-026 (Practice anyway persists Reviews), ADR-027 (time = wall-clock not Σ response_ms). 3 total.
- NOTES resolved: N031 (Practice anyway), N034 (MC shuffle). N040 filed (cross-session accuracy needs backend outcome persistence — Phase 10 candidate).
- Pre-push gates: 9 (unchanged). CI Playwright: 2 specs (unchanged).
- Test counts at close: vitest 37 → 47 files (+10), 343 → 431 tests (+88). Pytest 300 → 305 (+5: SDK override tests + API integration). Both Playwright specs unchanged.
- Bundle: 1.29 MB raw / 391.9 KB gzip → still 1.29 MB raw / ~395 KB gzip (Phase 7 added ~5-10 KB gzip across components). Comfortable headroom against 600 KB ceiling.
- Three owner stop points held: signal validation, anti-Duolingo compliance, chart aesthetic. One bug surfaced (rating-as-proxy accuracy) and was unwound cleanly via the P7-fix chain.
- File-size discipline: 5 sibling-test splits across the phase to keep individual files under 150 code-LOC (`api.stats.test.ts`, `use-session-details.test.ts`, `SessionPage.practice.test.tsx`, plus the P6.5-era `use-session-error-recovery.test.ts`).
- **Owner action:** push the full Phase 7 chain (commits `fb0c6f4` through `916068d` + this close commit). CI exercises both Playwright specs; bundle gate stays green; no schema changes.

---

## Phase 8 — Module 2 — Automation Content Authoring

**Goal:** Full Module 2 (Automation, Scripting, Infrastructure) content. All 8 spheres authored, validator green, tone calibrated against Module 1 gold sample. Mock Interview Generator removed from roadmap — see ADR-028.

| ID | Task | DoD | Status |
|---|---|---|---|
| T8.1 | `m2-s0` — Time & Date (lesson + cards, ≥ 12 cards across t1–t4). | Validator green; owner spot-check | ✅ (13 cards: 4 flip / 4 code_trap / 3 multiple_choice / 1 fill_in / 1 code_task; difficulty bands 1–4; `feat(p8.m2-s0)`) |
| T8.2 | `m2-s1` — Filesystem & OS (lesson + cards, ≥ 15 cards across t1–t5). `[CODE_TASK CAUTION]` — Pyodide filesystem is in-memory only. | Validator green; owner spot-check | ⬜ |
| T8.3 | `m2-s2` — Text & Regex (lesson + cards, ≥ 15 cards across t1–t5). | Validator green; owner spot-check | ⬜ |
| T8.4 | `m2-s3` — Serialization Formats (lesson + cards, ≥ 9 cards across t1–t3). | Validator green; owner spot-check | ⬜ |
| T8.5 | `m2-s4` — Network & APIs (lesson + cards, ≥ 12 cards across t1–t4). `[CODE_TASK CAUTION]` — no real network in Pyodide; mock or trap-only. | Validator green; owner spot-check | ⬜ |
| T8.6 | `m2-s5` — Subprocess (lesson + cards, ≥ 9 cards across t1–t3). `[CODE_TASK CAUTION]` — no subprocess in Pyodide; trap-only. | Validator green; owner spot-check | ⬜ |
| T8.7 | `m2-s6` — Production-grade Scripts (lesson + cards, ≥ 9 cards across t1–t3). | Validator green; owner spot-check | ⬜ |
| T8.8 | `m2-s7` — Modern Backend Basics (lesson + cards, ≥ 12 cards across t1–t4). | Validator green; owner spot-check | ⬜ |
| T8.9 | Module 2 coverage sweep: ≥ 80 cards total, every sub-task ≥ 3 cards, ≥ 1 `code_task` where Pyodide-feasible. | `scripts/validate_content.py` clean; manual coverage check | ✅ (104 cards shipped vs 80 target = +30%; 10 code_tasks; all 31 sub-tasks ≥ 3 cards; objective + qualitative audit clean — see Phase 8 close summary below) |

**Phase 8 exit gate:** Validator green, ≥ 80 cards across all 8 spheres, owner spot-check during sphere-by-sphere reviews ✅. **Phase 8 code-closed 2026-05-13.**

**Phase 8 close summary (2026-05-13):**
- 9 task IDs across 9 commits (T8.1-T8.8 = 8 sphere commits + T8.9 close commit). Plus the pre-Phase-8 `bff060f` cleanup that renumbered the phase plan and filed ADR-028.
- New ADRs filed: ADR-028 (Mock Interview Generator removed from roadmap; Phase 8/9 renumbered for content authoring). 1 total.
- NOTES filed: N041 (footgun-pair authoring pattern — code_trap + multiple_choice as a unit for security/correctness anchors; flagged for explicit replication in m4-s7 SQL injection and m4-s9 bash discipline).
- Pre-push gates: 9 (unchanged). Validator (`scripts/validate_content.py`) green throughout — schema, ID uniqueness, sphere refs, ≥3 cards per sub-task, all 10 code_task pytest executions, emoji lint.
- Content shipped: **104 cards across 8 spheres** (m2-s0=13, m2-s1=15, m2-s2=15, m2-s3=12, m2-s4=14, m2-s5=11, m2-s6=11, m2-s7=13). Eight lessons, each ≤ 700 words. One module overview (`02_automation_scripting/module.md`).
- Card type mix: 31 code_trap (29.8%) / 30 flip (28.8%) / 25 multiple_choice (24.0%) / 10 code_task (9.6%) / 8 fill_in (7.7%). code_trap dominance reflects the predict-the-behavior pedagogy the curriculum favors; fill_in is sparser because not every concept has a clean blank-pattern fit (owner-approved stance, m2-s1).
- Difficulty distribution: d1 8% / d2 39% / d3 42% / d4 12%. Bell-skewed toward 2-3 with d1 (warmup) and d4 (interview-grade) tails. No sphere over-skews to a single band; max concentration is 55% (m2-s6 d2), below the 60% warning threshold.
- `[CODE_TASK CAUTION]` spheres honored: m2-s4 (Network) and m2-s5 (Subprocess) ship zero code_tasks (no real network / subprocess in Pyodide); both rely on code_trap and multiple_choice for the marquee security questions. m2-s7 (FastAPI) ships one code_task using pydantic standalone (no FastAPI imports), per brief.
- Footgun-pair pattern (N041) landed: m2-s5 c2+c3 (shell injection trap + canonical-fix MC) as the full prototype; m2-s6 c2 (argparse `type=bool`) and m2-s6 c6 (`logger.exception`) as single-card anchors where the gotcha is shallow enough. Explicit replication targets queued for Phase 9: m4-s7 (SQL injection), m4-s9 (bash `set -euo pipefail`).
- Pydantic v2 (2.13.4) verified in host env before m2-s4 and m2-s7 authoring; v2 method names (`model_validate` / `model_dump`) used throughout; m2-s4-c14 explicitly drills the v1→v2 migration at d4 since 2026 codebases are mid-rename.
- Owner stop point held at every sphere (8 review-and-push cycles). Tone consistency vs Module 1 gold sample preserved (interleaved-first-card audit confirmed). Cross-sphere conventions (frontmatter, ID numbering, 4-option MC, ≥200-char explanations except one intentional 161-char warmup card on json naming) all consistent.
- Phase 9 next: Modules 3 & 4 content. `m3-s0` Philosophy is the default starting sphere.
- **Owner action:** push the full Phase 8 chain (commits `bff060f` through `62ba7ff` + this close commit). All 9 pre-push gates run automatically on `git push`; no schema or test changes.

---

## Phase 9 — Modules 3 & 4 — Testing / Infrastructure Content Authoring

**Goal:** Full curriculum coverage for Module 3 (Testing & QA) and Module 4 (Linux, Docker, SQL, Git, Tooling & Operations).

| ID | Task | DoD | Status |
|---|---|---|---|
| T9.1 | Module 3 (Testing & QA) — all spheres `m3-s0`–`m3-s5`. | Validator green, ≥ 60 cards | ✅ (70 cards shipped vs 60 target = +17%; 10 code_tasks; all 19 sub-tasks ≥ 3 cards; objective + qualitative audit clean — see Module 3 close summary below) |
| T9.2 | Module 4 (Linux, Docker, SQL, Git, Tooling & Operations) — all spheres `m4-s0`–`m4-s9` (incl. m4-s7 Web Security, m4-s8 CI/CD, m4-s9 Bash, added in `78278a5`). | Validator green, ≥ 100 cards | ✅ (156 cards shipped vs 100 target = +56%; 0 code_tasks by design — infrastructure topics aren't Pyodide-executable; all sub-tasks ≥ 3 cards; objective + qualitative audit clean — see Module 4 close summary below) |
| T9.3 | Coverage check ≥ 95% sub-tasks × 3 cards across Modules 3 + 4. | Script confirms | ⬜ |
| T9.4 | Spot-check by owner: 20 random cards across both modules for accuracy. | Owner sign-off | ⬜ |

**Phase 9 exit gate:** Coverage check green, owner-spot-check passed.

**Module 3 close summary (2026-05-13):**

- 7 task IDs across 7 commits (T9.1.0–T9.1.5 = 6 sphere commits + T9.1.6 mini-sweep close). No new ADRs; 3 new NOTES (N042 emoji-block-range, N043 single-file-harness constraint, N044 deps-verification rule). Constraint catalog for code_task authoring now N039 + N043 + N044; promotion to `PRD_code_sandbox.md` appendix is post-Module-4 polish per owner brief.
- Pre-push gates: 9 (unchanged). Validator (`scripts/validate_content.py`) green throughout — schema, ID uniqueness, sphere refs, ≥ 3 cards per sub-task, all 10 code_task pytest executions, emoji lint.
- Content shipped: **70 cards across 6 spheres** (m3-s0=8, m3-s1=12, m3-s2=12, m3-s3=14, m3-s4=16, m3-s5=8). Six lessons, each ≤ 700 words. One module overview.
- Card type mix: 20 code_trap (28.6%) / 18 flip (25.7%) / 16 multiple_choice (22.9%) / 10 code_task (14.3%) / 6 fill_in (8.6%). Code_task density higher than Module 2 (14.3% vs 9.6%) because pytest is fully Pyodide-compatible; 0 code_tasks only in m3-s5 (Coverage), where the natural pedagogy is interpretation not execution.
- Difficulty distribution: d1 17.1% / d2 21.4% / d3 34.3% / d4 27.1%. Skewed toward d3-d4 more than Module 2 (which was d2-d3 dominant) because Module 3 leans interview-grade — most testing knowledge that distinguishes engineers is mechanism / gotcha shaped (d4), not vocabulary shaped (d1). Every sub-task has all PRD §6 bands (1-2 / 3 / 4-5) represented.
- Per-sphere skew: every sphere stays under the 60% single-band threshold. Max concentration is m3-s4 d3 at 44%.
- All 36 MC + code_trap cards have exactly 4 options. All 6 fill_in cards: blank count matches `accepted_answers` groups. All 10 code_tasks: stdlib-only imports (N044 compliant), single-file shape (N043 compliant), `allowlist=['pytest']`. 0 emoji hits. ID continuity intact (c1..cN per sphere, no gaps).
- N041 footgun-pair canonical instance: `m3-s4-c7` (code_trap d4, patch-where-defined) + `m3-s4-c8` (multiple_choice d3, canonical-fix). Trap_diff ≥ fix_diff verified; tags overlap on `patch`/`where-used`/`mock`/`footgun-pair`. Pattern compliance confirmed.
- Composite-distractor lineage (NOTES candidate for future formalization): 5 Module 3 instances at `m3-s0-c3`, `m3-s1-c11`, `m3-s2-c7`, `m3-s4-c15`, `m3-s5-c7`. Each has 4 options with 3 wrongs-for-different-reasons; total catalog across Modules 2+3 now 6 instances.
- Recursive meta-pedagogy: 5 code_tasks where hidden tests use what the cards/sphere teach — `m3-s1-c3` (test_* discovery), `m3-s2-c6` (parametrize), `m3-s3-c3` (fixture DI), `m3-s3-c6` (yield-finalizer), `m3-s4-c3` (Mock injection at boundary).
- Single soft-flag during audit: `m3-s2-c7` distractor explanations at 49 chars each (below the 50-char "substantive" heuristic). Reviewed: explanations are tight, accurate, name the misconception in one sentence each. Quality bar (PRD §6: ≥ 2 of 4 options plausibly wrong-for-interesting-reason) is met with 3/4 wrongs; the heuristic flag is below the bar that matters. NOT a defect; observation only.
- Single-card d4 footgun candidates worth retroactive N041 fix-MC pair (per N041 future-enhancement clause, owner discretion): top 3 are `m3-s2-c4` (regex `match=`), `m3-s4-c5` (assert_called_with LAST-call), `m3-s3-c10` (session-scope contamination). All three have clean 4-option fix-MC shapes available; deferred unless owner prioritizes.
- **Owner action:** push the full Module 3 chain (commits `2710deb` through `c0be15a` + this close commit). All 9 pre-push gates run automatically on `git push`; no schema or test changes.

**Module 4 close summary (2026-05-14):**

- 11 sphere commits (`a5d4e9d` m4-s0 → `1fa0350` m4-s9, including `4589738` mid-module N046 codification) + this close commit (T9.2.10 cross-sphere quality sweep). 3 new NOTES (N045 schema explanation-field naming in m4-s1, N046 cross-card reinforcement pattern in m4-s2..s4, N047 obviously-fake placeholder discipline in this close — see below).
- Pre-push gates: 9 (unchanged). Validator (`scripts/validate_content.py`) green throughout — schema, ID uniqueness, sphere refs, ≥ 3 cards per sub-task, emoji lint. (Zero code_task pytest executions because Module 4 ships zero code_tasks; see card-type note below.)
- Content shipped: **156 cards across 10 spheres** (m4-s0=14, m4-s1=14, m4-s2=18, m4-s3=15, m4-s4=15, m4-s5=13, m4-s6=13, m4-s7=18, m4-s8=18, m4-s9=18). Ten lessons, each ≤ 700 words. One module overview.
- Card type mix: 63 multiple_choice (40.4%) / 49 flip (31.4%) / 36 code_trap (23.1%) / 8 fill_in (5.1%) / **0 code_task**. Zero code_tasks is *deliberate*, not a gap: Module 4 covers infrastructure topics (networking, linux CLI, docker, SQL, git, web security, CI/CD, bash) that aren't executable via Pyodide pytest harness — there is no shell, no docker daemon, no real network, no DB connection, no git worktree in the browser sandbox. The right pedagogy for these topics is recognize-the-pattern (code_trap), pick-the-fix (multiple_choice), or recall (flip/fill_in). Module 3 shipped 10 code_tasks because pytest is fully Pyodide-compatible; Module 4 has no equivalent leverage.
- Difficulty distribution: d1 4.5% / d2 21.2% / d3 46.2% / d4 28.2%. Skewed harder toward d3-d4 than Module 3 (which was d3-d4 dominant at 61% combined; Module 4 is at 74%). Infrastructure knowledge that distinguishes engineers is mechanism+gotcha shaped almost entirely; vocabulary-recall (d1) plays a smaller role because most "what does this command do" knowledge isn't interview-discriminating once you've used a terminal.
- **Per-sphere skew flag: three spheres exceed the 60% single-band threshold** — `m4-s6` python_tooling (76% d3), `m4-s7` web_security (72% d3), `m4-s8` ci_cd (72% d3). Compare to Module 2's max 55% and Module 3's max 44%. Defensible: these three spheres' subject matter is structurally d3 — modern python tooling (uv / ruff / lockfile / pyproject), modern web security (parametrized queries / CORS rules / OAuth flow / cookie flags / HTTPS scope), and CI/CD (workflow YAML / secrets / matrix / branch protection) all have many discriminating mechanism cards at d3 depth, few d1-shaped vocabulary recall items, and few d4-shaped subtle gotchas. Not a defect; a structural property of the subject matter that's worth recording as the explanation if a future reviewer asks. Every sub-task still has cards across at least two PRD §6 bands.
- All 99 MC + code_trap cards have exactly 4 options. All 8 fill_in cards: blank count matches `accepted_answers` groups. ID continuity intact (c1..cN per sphere, no gaps). 0 emoji hits across all 156 cards (validator-enforced; manually re-greped). 0 realistic-shape secret hits across all 156 cards (manually greped for AKIA/sk_live/ghp_/JWT/bcrypt/argon2/40+ char hex — only legitimate hits found, see N047).
- **N041 footgun-pair canonical instances (2 of 2 expected):** `m4-s7-c1` (code_trap d4, SQL injection f-string trap) + `m4-s7-c2` (multiple_choice d3, parametrized-query canonical fix). Trap_diff ≥ fix_diff verified; tags overlap on `sql-injection`/`footgun-pair`/`interview-classic`. `m4-s7-c3` is the mechanism bridge card (flip d3, what the DB driver actually does — bonus discrimination beyond the two-card N041 baseline). `m4-s9-c10` (code_trap d4, script-without-set-e silent disaster) + `m4-s9-c11` (multiple_choice d3, set -euo pipefail flag-by-flag breakdown). Same canonical shape, tags overlap on `set-e`/`footgun-pair`/`interview-classic`. **Note on m4-s8 c11+c12:** brief flagged these as a third footgun-pair (secret rotation). Audit finding: they're NOT canonical N041 — c11 is a code_trap-as-MC hybrid where the options themselves enumerate the recovery procedure (no separate "pick the fix" card needed), and c12 is a different-angle prevention card (GITHUB_TOKEN scoping + OIDC) that thread-cites c11. Cards correctly DON'T carry `footgun-pair` tag because they're N046 incident-prevention thread shape, not N041. Pattern compliance confirmed (different pattern, applied correctly).
- **N046 cross-card threading instances landed organically:** m4-s2 signal-handling triple (c14+c15+c18); m4-s2→m4-s3 cross-sphere signal continuation (m4-s3-c8 cites m4-s2-c14/c15); m4-s3 incident-prevention pair (c3+c14); m4-s4 NULL semantics quad (c2+c8+c9+c15 spanning t1+t3+t5); m4-s4 aggregation-timing triple (c1+c10+c11); m4-s5 merge-vs-rebase decision quad (c10+c11+c12+c13); m4-s6 tooling-evolution thread (c2+c4+c8 for uv/ruff Astral story); m4-s6 lockfile thread (c5+c6); m4-s6 data-structure-optimization thread (c10+c11+c12+c13); m4-s7 SQLi thread (c1+c2+c3) and NULL/aggregate/CORS sub-threads; m4-s8 jobs-isolation thread (c2+c3), caching thread (c7+c8+c9), secrets thread (c10+c11+c12); m4-s9 set-euo-pipefail thread cross-cites `m4-s1-c6` (same shell rule in different context — production discipline vs rm-rf disaster). All threads pass the "stands alone" test; each card teaches a distinct facet, cross-references are additive not load-bearing.
- **N047 codified obviously-fake-placeholder discipline.** Discovery: m4-s8-c11's hardcoded-secret-incident scenario was authored with a placeholder that looked plausibly like a real API key; GitHub push protection blocked the push as a potential leak; rewritten to `REDACTED_FAKE_API_KEY_FOR_TEACHING`. Rule applies retroactively to all modules — sweep ran across `m1`–`m4` for AKIA/ghp_/sk_live/JWT/bcrypt/argon2/40+ char hex shapes; only legitimate hits found (the placeholder itself, a truncated JWT teaching example with payload decoding to `{"user_id":42}` in m4-s7-c7, a real `actions/checkout` git SHA in m4-s8-c5 — SHAs are public identifiers not credentials, an IEEE-754 binary expansion in m3-s1 — math not hash). Zero retrospective fixes required. Future validator enhancement candidate: add `_check_no_realistic_secret` rule to `scripts/validate_content.py`; deferred to Phase 10 polish per the rule's own structure.
- Cross-sphere consistency vs Modules 1/2/3 preserved: same topic-line conventions (noun phrase + colon + dichotomy/mechanism/list), same first-card-per-sphere arc (warmup → discrimination → trap), same interview-probe framing ("the interview-relevant version of this question is..."), same operational-reflex framing for production patterns. No tone drift; no emoji; no realistic credentials. Cross-citation density per sphere ranges 14–39 (m4-s0 lowest, m4-s5 highest — foundation-sphere vs anchor-rich-sphere split tracks the subject matter).
- **Owner action:** push the full Module 4 chain (commits `a5d4e9d` through `1fa0350` + this close commit). All 9 pre-push gates run automatically on `git push`; no schema or test changes.

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
| T10.8 | Content polish: retroactive N041 fix-MC pairs for surfaced single-card d4 footguns, + promote N039/N043/N044/N045/N047 constraint catalog to `PRD_code_sandbox.md` appendix. Deferred from per-module sweeps so polish is consolidated, not incremental. | Three retroactive pairs land + appendix exists | 🟨 (appendix landed in `PRD_code_sandbox.md` §10 — five constraints N039+N043+N044+N045+N047; section renamed to "Card authoring constraints" since §10.4 + §10.5 are broader than code_task; retroactive N041 pairs still pending owner authorization, see candidate list below) |

**T10.8 retroactive N041 fix-MC pair candidates (surfaced during module-sweep audits):**

- `m3-s2-c4` (`match=` is regex, not substring) — paired fix-MC compares `re.escape()` vs raw-string-with-manual-escapes vs anchored regex `^...$` vs unrelated solution. Currently single d4 code_trap; pairing adds explicit-prescription card.
- `m3-s4-c5` (`assert_called_with` checks LAST call only) — paired fix-MC compares `assert_called_once_with` (right for "called exactly once") vs `assert_any_call` (order-agnostic) vs `assert_has_calls` with `mock.call` (explicit sequence) vs manual `call_args_list` iteration.
- `m3-s3-c10` (session-scope mutable contamination) — paired fix-MC compares `scope='function'` (default, safe) vs `scope='session'` + immutable wrapper vs factory-fixture-returning-fresh vs deep-copy-per-test.
- (Future-add) any further d4 traps surfaced during Module 4 sweeps. Update this list as Module 4 closes.

**T10.8 constraint-catalog promotion:** ✅ landed in `PRD_code_sandbox.md` §10 "Card authoring constraints" (2026-05-14). Catalog scope expanded twice from the original Module-3-close plan (N039+N043+N044): N045 added because the rule is card-authoring-adjacent and surfaced twice (m3-s5-c6, m4-s1-c10); N047 added because §10.4 + §10.5 are explicitly broader than code_task (apply to every card type plus lessons), prompting the section header rename from "Code_task authoring constraints" to "Card authoring constraints". Each constraint section follows the same shape: rule → why → acceptable/forbidden forms → heuristic → cross-link to originating NOTES. Future authors read §10 once before writing their first card and have the five most common pre-validation gotchas already in hand. The validator-level enforcement of N047 (a `_check_no_realistic_secret` regex rule in `scripts/validate_content.py`) is documented in §10.5 as a Phase 10 follow-on candidate; deferred because retroactive sweep was clean and false-positive risk in lesson prose requires careful regex tuning.

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
