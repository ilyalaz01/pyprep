# PyPrep — Engineering Notes

A running log of small bootstrap-vs-reality discrepancies and their resolution.
For decisions large enough to merit an ADR, append to `PLAN.md` §6 instead.

---

## N001 — Coverage gate deferred from 85% to 0% until T2.12

**Phase:** 0 (T0.6) · **Date:** 2026-05-07

The bootstrap `pyproject.toml` shipped with `--cov-fail-under=85` already active.
TODO T0.6 explicitly says "warn-only initially" and T2.12 raises the gate to 85%
once the SDK exists. With no source yet, an 85% gate fails every `pytest` run
and blocks Phase 0 from going green.

**Resolution:** Lowered `--cov-fail-under` to `0` in `pyproject.toml`. T2.12
remains the canonical point at which the project-wide gate is re-raised to 85%
(and `scheduler/` + `stats/` to 95% per Hard Rule 6).

---

## N002 — FSRS PyPI package is `fsrs`, not `py-fsrs`

**Phase:** 0 (T0.1) · **Date:** 2026-05-07

`PRD.md` §6.2, `PLAN.md` ADR-002, and the bootstrap `pyproject.toml` all
reference `py-fsrs`. That is the **GitHub repo name**
(`open-spaced-repetition/py-fsrs`); the package on PyPI is published as `fsrs`.
`uv sync` failed at first attempt with "py-fsrs was not found in the package
registry".

**Resolution:** Replaced the dependency with `fsrs>=6,<7` (latest published
6.3.1). The library still implements FSRS as described in ADR-002; only the
distribution name changed. PRD/PLAN copy left as-is — the algorithm choice
they document is unchanged.

---

## N003 — Python pinned to 3.11 via `.python-version`

**Phase:** 0 (T0.1) · **Date:** 2026-05-07

Owner directive: pin to 3.11 (no minor) so `uv` picks the latest 3.11.x
patch consistently across the owner's machine and CI. 3.12 is deferred until
Pyodide and a few transitive libs settle. Documented here so the choice
doesn't drift silently when 3.12 starts looking attractive.

---

## N004 — `module_id` and `sphere_id` live on the wrapper, not on each card

**Phase:** 1 (T1.1) · **Date:** 2026-05-07

`PRD_content_authoring.md` §5 shows a card schema excerpt with
`required: ["id", "module_id", "sphere_id", "type", "topic", "difficulty", "tags"]`.
The actually-locked `content/schema/card.schema.json` makes `module_id`
and `sphere_id` optional — and the gold sample
(`00_fundamentals.cards.json`) supplies them at the wrapper level
(`{module_id, sphere_id, cards: [...]}`), not on every card.

**Resolution:** Schema and gold sample are authoritative. The PRD §5
block is illustrative (it's annotated "(excerpt)"). The validator (T1.10)
will derive each card's `module_id`/`sphere_id` from the wrapper rather
than expecting them per-card. No PRD edit — the discrepancy is small
enough that future readers can confirm against the schema directly.

---

## N007 — Distractor polish backlog (post-MVP)

**Phase:** 1 (Tx.x follow-ups) · **Date:** 2026-05-07 · **Priority:** low

Per `PRD_content_authoring.md` §6 distractor rule, ≥ 2 of 4 options
must be plausible-wrong-for-an-interesting-reason. The cards below
are still 3/4 strong; the polish is post-MVP.

Owner spot-check #1 (T1.5 — Sphere 1):

- `m1-s1-c2` option 4 currently: "Prints None". Stronger:
  "Prints 'hi' but with a DeprecationWarning".
- `m1-s1-c3` option 4 currently: "`__new__` runs only on subclasses;
  `__init__` runs only on the base class". Stronger: "`__init__`
  returns the new instance; `__new__` returns the type".

Owner spot-check #2 (T1.6 — Sphere 2):

- `m1-s2-c3` option 4 ("`Parent.__init__(self)` only works in
  Python 2") is factually weaker than the other distractors — the
  option_explanation already disarms it, but it's not as plausible
  as it could be. Look for a stronger junior-plausible misconception.

Cross-reference density (also from spot-check #2):

- Sphere 1 cross-referenced m1-s0 in the lesson; Spheres 2 and 3 had
  fewer natural tie-back hooks. Going forward, lean into them where
  genuine: decorators → closures (s5↔s4), generators → iterators
  (s5 internals), GIL → threading mental model (s6↔s5). Don't force.

---

## N006 — Validator enforces min-cards per *sphere*, not per sub-task

**Phase:** 1 (T1.10) · **Date:** 2026-05-07

`PRD_content_authoring.md` §7 specifies "Min 3 cards per sub-task"
(e.g., `m1-s0-t1`). Cards in the gold sample don't carry a `subtask_id`
field — only `sphere_id` (via the wrapper) and free-form `tags` —
so per-sub-task enforcement isn't possible without a schema addition.

**Resolution:** T1.10 enforces the looser invariant `cards-per-sphere
≥ 3 × subtasks-per-sphere`, which is necessary but not sufficient for
the strict spec (a sphere with 4 sub-tasks could pass with 12/0/0/0).
Tightening to per-sub-task requires adding an optional `subtask_id`
field to the card schema and the gold sample. Tracked as a
post-Phase-1 backlog candidate; not blocking until coverage drift
becomes a real problem.

---

## N005 — Module 1 has 7 spheres (m1-s0…m1-s6), not 6

**Phase:** 1 audit · **Date:** 2026-05-07

`curriculum.md` and `module.md` both enumerate 7 spheres for Module 1,
ending with **m1-s6 — Concurrency & GIL** (a curriculum (ADDED) item).
TODO.md Phase 1 only has tasks T1.5–T1.9 covering m1-s1 through m1-s5,
leaving m1-s6 unscheduled. This is a backlog gap, not just a doc
inconsistency.

**Resolution:** Added a `(NEW)` task to TODO.md Phase 1 covering
m1-s6. Phase 1 is not "done" until the validator confirms ≥ 3 cards
per sub-task across all 7 spheres.

---

## N008 — `PRD_spaced_repetition.md` weights count (17) is FSRS-5; installed library is FSRS-6 (21 params) [CLOSED]

**Phase:** 2 (T2.3) · **Opened:** 2026-05-08 · **Closed:** 2026-05-08

`PRD_spaced_repetition.md` §2.3 said "FSRS-5 default — the 17 model
weights". The pinned `fsrs>=6,<7` is FSRS-6 with 21 parameters.

**Resolution (owner verdict, T2.3 checkpoint, option a):** keep
`fsrs>=6,<7` and update PRD §2.3 to reflect FSRS-6. The wrapper passes
through `fsrs.Scheduler`'s built-in defaults rather than constructing
a literal weight vector. PRD §2.3 wording now says "FSRS-6 library
defaults" without specifying parameter count — keeps the doc future-
proof if FSRS-7 ships with a different shape. Closed.

---

## N009 — `CardState.step` is required for round-trip fidelity (not in PRD §2.2) [CLOSED]

**Phase:** 2 (T2.3) · **Opened:** 2026-05-08 · **Closed:** 2026-05-08

PRD §2.2 listed `CardState` with 7 fields. The `fsrs` library's `Card`
carries an additional `step: int` indexing position in
`learning_steps`/`relearning_steps`; without persisting it, a card
mid-way through learning would restart the sequence on every load.

**Resolution (owner verdict, T2.3 checkpoint, option a):** ratify by
amending PRD §2.2 to list 8 fields including `step`. We committed to
`fsrs` via ADR-002; hiding `step` in a nested algo blob would be
premature abstraction for a single-implementation project. Public
surface stays on the dataclass. Closed.

---

## N010 — FSRS golden vectors deferred; property tests in place

**Phase:** 2 (T2.3) · **Date:** 2026-05-08 · **Status:** open (backlog)

PRD `PRD_spaced_repetition.md` §4.1 mentions "Golden vectors imported
from `py-fsrs` reference tests." Published FSRS reference vectors are
calibrated to specific parameter sets (FSRS-5 weights), and FSRS-6
defaults differ — direct import would not match.

**Resolution:** for MVP, behavioral property tests + 100% coverage on
`scheduler/` are sufficient. The 14 T2.3 tests pin: round-trip
fidelity, validation rules, monotonic stability on repeated GOOD,
eventual graduation to "review", AGAIN-after-review → "relearning",
deterministic byte-identical replay.

**If golden vectors become useful later:** generate our own. Run a
20-step canonical history (PRD §4.3) with fixed `enable_fuzzing=False`
(ADR-009) and `desired_retention=0.9`, snapshot the resulting state
chain to `tests/snapshots/scheduler_canonical.json`, replay-and-
compare in a snapshot test. Don't import upstream vectors. Backlog,
not blocking.

---

## N011 — `passlib` broken with `bcrypt` ≥ 5; AuthService uses `bcrypt` directly [CLOSED]

**Phase:** 2 (T2.7) · **Opened:** 2026-05-08 · **Closed:** 2026-05-08

`passlib` 1.7.x's bcrypt backend reads `bcrypt.__about__.__version__`,
which `bcrypt` 5.x removed. AuthService uses `bcrypt` directly.

**Resolution (owner verdict, T2.7 checkpoint):** dropped
`passlib[bcrypt]` from `pyproject.toml`; replaced with `bcrypt>=4,<6`
explicit dep. Verified no `passlib` import remains in source or tests.
PRD §6.2 / NFR-SEC-2 "passwords bcrypt-hashed" still satisfied —
wrapper library changed, primitive unchanged. Closed.

Anti-enumeration timing-parity follow-up tracked in N012.

---

## N012 — AuthService polish nits [CLOSED]

**Phase:** 2 (T2.7 review) · **Opened:** 2026-05-08 · **Closed:** 2026-05-09
(promoted from Phase 10 to T3.2 per owner directive — adapter scope was the
right time for these to land alongside HTTP error mappings)

Three nits raised at the T2.7 owner review of `auth/service.py`. All
three are contract-tightening, not security holes. Fix in the Phase 10
polish pass.

### N012.1 — Pin `bcrypt.gensalt(rounds=12)` explicitly [CLOSED, T3.2]

`auth/service.py` now hard-codes `_BCRYPT_ROUNDS = 12` and passes it to
`bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)`. Owner picked Option A (no knob);
exposing rounds via constructor was YAGNI for current scale. Test
`test_register_uses_explicit_bcrypt_rounds_12` asserts the cost factor
in the produced hash so future bcrypt-default drift trips CI.

### N012.2 — Tighten `_decode` exp-claim handling [CLOSED, T3.2]

`_decode` now raises `InvalidTokenError` when `exp` is missing or non-int,
*before* the expiry check. Tests pin both the non-int path
(`test_decode_rejects_token_with_non_int_exp`) and the missing-exp path
(`test_decode_rejects_token_with_missing_exp`). Contract is now: a
malformed payload is invalid, not silently accepted.

### N013 — NFR-OBS-1 (structured logs) is API-layer, not SDK [CLOSED]

**Phase:** 2.5 audit · **Opened:** 2026-05-08 · **Closed:** 2026-05-09 (T3.1)

NFR-OBS-1 says "Structured JSON logs, log levels configurable via env."
Today this lives nowhere — SDK services have no logging, and there is
no API layer yet. The audit flagged it as missing.

**Resolution (T3.1):** wired at the API layer per the audit's preferred
seam. `src/pyprep/api/log_config.py` configures structlog with a JSON
renderer, ISO-UTC timestamp, contextvars merge, and exc_info formatter.
`src/pyprep/api/middleware.py:RequestLoggingMiddleware` binds a
`request_id` (header or uuid4) to contextvars per request and emits one
`request` event with method, path, status, duration_ms (and `x-request-id`
on the response). Log level is `Settings.log_level`. SDK code remains
pure — no logging on hot paths, as planned. Closed.

---

### N014 — `due_card_ids` Python aggregation, switch to SQL window function [Phase 3]

**Phase:** 2.5 audit · **Date:** 2026-05-08 · **Status:** open

`ReviewRepository.due_card_ids` loads all of a user's reviews and
aggregates in Python ("first hit per card_id newest-first"). Acceptable
for ≤ 5K reviews per user (PRD §3.3); on Postgres, a `ROW_NUMBER() OVER
(PARTITION BY card_id ORDER BY reviewed_at DESC)` query is the right
form once we move off SQLite-in-memory tests. The `(user_id, due_at)`
and `(user_id, card_id, reviewed_at)` indexes are already in place.

**Resolution at Phase 3:** when the FastAPI app first hits a real
Postgres dev DB, replace the Python aggregation with a window-function
query. Keep the SQLite path as a fallback for owner local dev mode.

---

### N015 — `User.timezone` field + tz-aware streak() default [Phase 7]

**Phase:** 2.5 audit · **Date:** 2026-05-08 · **Status:** open

`StatsService.streak()` accepts `user_tz: str = "UTC"`. The auth `User`
entity does not carry timezone; callers must pass it explicitly. The
audit flagged that the streak UI should default to the user's stored
tz, not UTC. Phase 7 (stats UI) is the natural home — add `timezone:
str = "UTC"` to `User`, plumb through to streak() default.

---

### N016 — FR-STATS-1 per-tag aggregation [Phase 7]

**Phase:** 2.5 audit · **Date:** 2026-05-08 · **Status:** open

PRD progress §3.1 FR-STATS-1 says "Compute per-card, per-task,
per-sphere, per-module, **per-tag** retention and volume." StatsService
covers per-card (implicitly), per-sphere, per-module. Per-tag
aggregation is missing. Phase 7 dashboard work will need it for tag
filters.

---

### N017 — FR-STATS-3 time-spent aggregation from response_ms [Phase 7]

**Phase:** 2.5 audit · **Date:** 2026-05-08 · **Status:** open

`Review.response_ms` is captured per submit but never summed. PRD
progress §3.1 FR-STATS-3 says "Daily stats: cards reviewed today, time
spent, accuracy." `time_spent_today_ms` is missing from `DailyStat`.
Phase 7 stats UI is where this lands.

---

### N018 — FR-CONTENT-5 hot-reload [post-MVP]

**Phase:** 2.5 audit · **Date:** 2026-05-08 · **Status:** open

PRD §3.1 FR-CONTENT-5 says "Content is loaded at server start from
`content/` directory, cached in memory, **reloaded on file change in
dev mode**." ContentLoader supports `load()` once; the watcher /
inotify wiring is post-MVP. Dev workflow is fine via API restart for
now. Track for the polish pass.

---

### N012.3 — Surface deferred timing-parity at the call site [CLOSED, T3.2]

`login()` now carries the inline `TODO(public-mode)` comment between
`get_by_email` and the `checkpw` branch. Test
`test_login_body_carries_n012_3_todo_comment` greps the source so the
comment can't be silently deleted by a future refactor.

---

## N019 — `SessionService.preview_queue` SDK addition for /api/review/queue

**Phase:** 3 (T3.5) · **Date:** 2026-05-09 · **Status:** added

PRD §7 / TODO T3.5 expose `GET /api/review/queue` — "today's FSRS queue".
The pre-T3.5 SDK shape had `SessionService.start(mode='review', ...)`
which both builds the queue *and* persists a `Session` row. The home-page
"Review now" widget needs the queue without the side effect (the SPA
calls `/api/sessions` separately to start the actual session). The
`build_queue` helper in `sessions/queue_builder.py` is the right pure
function but was internal — the router cannot reach into it without
violating Hard Rule 2 (handlers depend on SDK public surface only).

**Resolution:** added `SessionService.preview_queue(*, user_id, mode,
sphere_id, limit, daily_new_card_cap) -> tuple[str, ...]` — a thin
wrapper that calls `build_queue` with the service's bound `cards` and
`reviews`. Side-effect-free. Same parameters as `start()` minus the
session-creation knobs. Test pins parity: `preview_queue` returns the
same `card_ids` that `start()` would have populated `session.queue` with.

---

## N020 — `/api/mock/prompt` `generate` handler exceeds the ≤10 LOC budget (deliberate)

**Phase:** 3 (T3.7) · **Date:** 2026-05-09 · **Status:** accepted exception

`routers/mock.py:generate` is 14 LOC of logic — over the Hard Rule 2
≤10-LOC ceiling. The body of the handler is a field-by-field construction
of `MockPromptRequest` from `MockPromptBody`. The owner approved the
exception with this rationale:

The point of the ≤10 LOC rule is "handler is auditable at a glance" —
a security reviewer must be able to see the whole HTTP→SDK mapping
without chasing helpers. An explicit `field=body.field` assignment is
exactly that: the reviewer can verify each Pydantic field flows to the
right SDK dataclass field at a glance. Hiding the construction in a
`_to_request(body)` helper would shrink the handler but spread the
mapping across two locations, making "is field X mapped correctly?"
harder to answer. **Spirit > letter.**

If a future contributor sees the 14 LOC and tries to "fix" it by
extracting a helper or splatting via `**body.model_dump()`, leave this
note as the reason not to.

---

## N021 — Sessions router HTTP design: idempotency, /next, authz

**Phase:** 3 (T3.4) · **Date:** 2026-05-09 · **Status:** decided

Three contract decisions made before T3.4 code lands so future readers
see the *why* next to the *what*.

### N021.1 — `idempotency_key` is body-only, optional, no fallback (Option C)

`POST /api/sessions/{id}/answer` body field:
```python
idempotency_key: str | None = Field(
    default=None, min_length=16, max_length=128, pattern=r"^[A-Za-z0-9_-]+$"
)
```

- **Body, not URL/query.** URLs leak through access logs and Referer
  headers; idempotency keys can leak the action context (which card,
  which user activity). Body keeps them payload-scoped.
- **Optional, no server fallback.** Clients that care about double-click
  protection generate a UUID per submission and pass it. Clients that
  don't accept the risk of a duplicate review row on retry. The T2.5.2
  fix was for *true* duplicates (same key, same card, same session); a
  server-side fallback (e.g., `hash(card_id+minute_bucket)`) would
  collapse legitimate re-rates and is worse than no protection.
- **Length floor 16, ceiling 128, alnum+`_-`.** Prevents trivially-short
  keys (`"1"`) that would silently collide; matches UUID (36 chars) and
  ULID (26 chars) shapes plus a margin for prefixed schemes.

Dedup semantics (inherited from T2.5.2):
- Same key + same `(session_id, card_id)` → returns the original review's
  resulting `next_state`. Silent dedup. New rating is **ignored** (the
  first write wins; honest semantics for "you already submitted this").
- Same key + different `card_id` → not deduped. The key is scoped per
  `(session, card)`, not globally per session.
- Same key + different `session_id` → not deduped. Sessions are isolated.

The HTTP response shape is identical for dedup hits and fresh writes
(200 + `{next_due_at, new_state}`). The route does **not** expose an
`is_duplicate` flag — clients should treat `/answer` as idempotent and
not branch on it; surfacing it would invite UX coupling to server
internals.

### N021.2 — `GET /{id}/next` is a stateless lookup, not a cursor

ADR-010 says the client owns queue progression. The `/next` endpoint is
a server convenience that returns `queue[0]` (or `queue[index_of(after)+1]`
if `?after=card_id` is supplied) plus the card's full `raw` content for
rendering. No server-side cursor is stored. If the client deviates from
the queue, the server returns whatever the client asks about; deviation
is an accepted tradeoff per ADR-010.

### N021.3 — Cross-user session access is 404, not 403

If a user sends a `session_id` that exists but belongs to another user,
the route returns 404 (not 403). 403 leaks the existence of other users'
sessions; 404 doesn't distinguish "doesn't exist" from "not yours". This
is the standard anti-enumeration default (same family as the auth
unknown-email→`InvalidCredentialsError` decision).

---

## N022 — `SessionService.finish` made idempotent for HTTP retries [SDK addition]

**Phase:** 3 (T3.4) · **Date:** 2026-05-09 · **Status:** added

The pre-T3.4 `finish` always overwrites `ended_at` with `self._clock()`,
so a flaky-network retry from the SPA would (a) write a new `ended_at`
to the DB and (b) return a `SessionSummary` whose `ended_at` differs
from the first response. The HTTP `/api/sessions/{id}/finish` endpoint
needs to be idempotent so retries are safe.

**Resolution:** if `session.ended_at is not None`, `finish` returns the
existing summary without touching the DB. Same `cards_total`,
`cards_correct`, `retention` as the first call. Test pins byte-equality
of two consecutive `finish` calls.

This keeps the route handler trivial (no try/except for "already
finished" and no special HTTP status for the second call — both calls
return 200 with the same body). Per N019/N020 pattern, the SDK addition
is committed before the route lands.

---

## N023 — Typed card-response models deferred to Phase 4

**Phase:** 3 (T3.4 review) · **Date:** 2026-05-09 · **Status:** deferred

`GET /api/sessions/{id}/next` returns `NextCardResponse.raw: dict[str, Any]`
— the full card JSON for SPA rendering. A typed discriminated union
(`FlipCardResponse | CodeTrapResponse | MultipleChoiceResponse | ...`)
would be more correct, but card-type schemas drive both the wire format
*and* the SPA card-renderer components. Typing the response without the
companion TypeScript types + per-type renderer prop shapes means
designing the contract twice — once now, once in Phase 4 when the SPA
card components actually consume it.

**Resolution:** keep `dict[str, Any]` for Phase 3. In Phase 4 (frontend
shell), define the per-card-type Pydantic + TypeScript pair together so
the wire format and the renderer match. The card content is non-secret
(also accessible via `/api/modules`), so untyping the response is a
clarity loss, not a security risk.

---

## N024 — Inbound rate limiting on /api/auth/* [Phase 10]

**Phase:** 3.5 (audit F2) · **Date:** 2026-05-09 · **Status:** deferred

The audit flagged that `/api/auth/login` and `/api/auth/register` have
no inbound rate limit. A bot could brute-force passwords or enumerate
emails. For single-user self-hosted MVP-1, this is not a real exposure
(only the owner hits the endpoint), but **must be addressed before any
public deploy**.

**Important clarification on `APIGatekeeper`:** `pyprep.sdk.shared.gatekeeper.
APIGatekeeper` is an **OUTBOUND** rate limiter — sliding-window per
external host, used by anything in the SDK that would call out to
external APIs (currently nothing; the seam exists for future LLM /
content-source integrations). It is **NOT** an inbound limiter and
should not be confused with one. A docstring clarification is added
below to the SDK to prevent misreading.

**Resolution at Phase 10:** add Starlette middleware (or use
`slowapi`/`fastapi-limiter` with Redis when Postgres+Redis become
available). Per-IP buckets with `Retry-After` header on 429.

---

## N025 — Two-worker single-user-startup race test [Phase 10]

**Phase:** 3.5 (audit Section C #4) · **Date:** 2026-05-09 · **Status:** deferred

The single-user lifespan hook (`api/lifespan.py`) handles
`EmailAlreadyExistsError` from a race between two simultaneously-
starting workers. The unit-test coverage is "two app boots against
the same DB file" (sequential) — not a true two-worker race.

**Why deferred:** MVP-1 runs single-process uvicorn (no worker
multiplexing). Multi-worker (`uvicorn --workers 4`) lands at Phase 10
production deploy; the race test gets written then with `multiprocessing`
or two real worker processes.

---

## N026 — Alembic downgrade test [Phase 10]

**Phase:** 3.5 (audit Section C #5) · **Date:** 2026-05-09 · **Status:** deferred

`tests/integration/test_alembic_migration.py` pins forward (upgrade
head + drift compare) but does not exercise `alembic downgrade`. Phase
10 adds a test that goes `upgrade head → downgrade base → upgrade head`
and asserts schema equality at the start and end. Catches reversibility
breaks before they bite a prod rollback.

---

## N027 — Body-size limit + 413 [Phase 10]

**Phase:** 3.5 (audit Section C #6) · **Date:** 2026-05-09 · **Status:** deferred

FastAPI / Starlette have no built-in request-body-size limit. A 100 MB
POST to `/api/auth/register` would consume memory before Pydantic ever
sees it. Phase 10 adds a `MaxBodySizeMiddleware` (e.g. 256 KB cap on
`/api/*`, 5 MB on `/api/sessions/{id}/answer` if code-task answers
ever flow over the wire — but they shouldn't per ADR-001) → 413
Payload Too Large.

---

## N028 — Content hot-reload via /admin/reload [merged into N018]

**Phase:** 3.5 (audit G5) · **Date:** 2026-05-09 · **Status:** merged

The audit raised content hot-reload as a separate item (`/admin/reload`
endpoint to re-trigger `ContentLoader.load()`). N018 already tracks
the broader hot-reload requirement (PRD §3.1 FR-CONTENT-5). Both are
the same Phase-post-MVP item — merged into N018's scope rather than
tracked separately. The endpoint shape decision (`/admin/reload` vs.
inotify watcher vs. SIGHUP handler) is left to whoever picks up N018.

---

## N029 — Content emoji lint in `validate-content` [CLOSED, T4.5.3]

**Phase:** 4 (T4.5.3) · **Date:** 2026-05-09 · **Status:** added + closed

The Module 1 lessons shipped with decorative emoji (`⚠️`, `🤯`, `😱`) in
section headers and code-comment captions. Per PRODUCT.md principle 1
(honest signaling > motivational theatre) and the T4.5 anti-AI-slop
spec, these don't belong in PyPrep's tone register.

**Resolution:**
1. Stripped the emoji from `content/modules/01_python_core_oop/00_fundamentals.md`.
   Replacements: `# ⚠️ TRAP` → `# TRAP — common interview pitfall`;
   trailing `😱` after a print result → just the result; section heading
   `## Concept 2 — ⚠️` → drop the glyph; the heading carries the signal.
2. Added `_check_no_emoji(root)` to `pyprep.tools.validate_content` —
   greps every `.md` and `.json` file under `content/modules/` for
   characters in the Unicode emoji + miscellaneous-symbols ranges
   (`\U0001F300-\U0001FAFF`, `☀-➿`). Fails the validator with a
   per-line error citing N029.
3. 3 regression tests pin: lesson with emoji → fails; clean lesson → passes;
   emoji in card JSON → fails (the wrappers are content too).

**If a future card legitimately needs an emoji glyph** (e.g. a lesson
about the `🐍` Unicode codepoint), grant a per-line waiver via a NOTES
amendment and update `_check_no_emoji` to skip it. Do not relax the
rule globally.

---

## N031 — "Practice anyway" override after daily cap reached [Phase 7]

**Phase:** 7 · **Date:** 2026-05-11 · **Status:** open

Today, when the user has exhausted today's review-due cards and
`daily_new_card_cap` has gating effect, `SessionPage`'s
`EmptySession` shows "You're caught up. Come back tomorrow for new
cards." (`frontend/src/pages/SessionPage.tsx:120`) and offers only
"Back to module."

Owner wants the option to override the cap and practice the same
content again — useful for the day-of-interview "warm pass" use case
and for the user who simply wants more reps. Surface as a secondary
CTA on the caught-up empty state ("Practice anyway"), distinct from
the "no cards authored" empty state which has no override.

**Open question:** does "practice anyway" record Reviews against
FSRS state? Two reasonable answers — (a) yes, FSRS handles dense
revisits via decreasing-difficulty signals; (b) no, dry-run mode
that doesn't perturb scheduling. Lean (a) per ADR-015 (FSRS owns
scheduling); confirm with owner at Phase 7 entry.

A `TODO(phase-7)` comment already sits on `EmptySession` in
SessionPage.tsx pointing at this note.

---

## N032 — Review history view [Phase 7 / Phase 8]

**Phase:** 7 or 8 · **Date:** 2026-05-11 · **Status:** open

Owner wants a surface to browse past answered cards with their
recorded answers — for re-study without going through the rating
loop. Read-only counterpart to the active-session card flow.

Phase placement depends on how the stats dashboard scopes:
- If the Phase 7 stats UI grows a "drill-down on a sphere" view
  that lists recent reviews, the history view rides that surface.
- Otherwise it lands as a standalone Phase 8 page.

Backend has the data (`Review` rows carry `card_id`, `rating`,
`response_ms`, `created_at`); a paginated `GET /api/reviews` (or
`/api/users/me/reviews`) is the natural API. Worth aggregating with
N017 (time-spent) so a single endpoint serves both surfaces.

---

## N033 — Custom session from rated-hard cards across modules [Phase 7]

**Phase:** 7 · **Date:** 2026-05-11 · **Status:** open

"Exam mode": pull a session of all cards the user marked Again or
Hard recently (across modules and spheres), regardless of FSRS due
date. Stats-driven session generator. Useful as a focused weakness
pass before an interview.

Cross-references **N016** (per-tag stats aggregation) — both share
the same need for cross-sphere aggregation queries on `Review` rows.
The "rated-hard" filter is a thin layer on top of N016's machinery.

API shape sketch: `POST /api/sessions { mode: 'custom',
filter: { recent_ratings: [1, 2], window_days: 7, limit: N } }`.
The existing custom-session params on `api.sessions.start` already
include `difficulty_min/max` and `count` — the rating filter is the
new field.

---

## N034 — MC option shuffle on AGAIN re-insertion [Phase 6 or 7]

**Phase:** 6 or 7 · **Date:** 2026-05-11 · **Status:** open

When a `MultipleChoiceCard` returns to the queue via AGAIN, the
session today re-renders the same options in the same order. The
user's recall is partly position memory ("the answer was the third
one") rather than recognition.

Fix: shuffle the options on the second presentation. Stable per
mount via the ADR-016 `key={card.id}` rule won't help here because
the same card key recurs — need to derive a per-attempt seed
(e.g., `attempt_index` from `SessionQueue`) and use it to shuffle
options deterministically. Tests pin: same card, two attempts,
options render in different orders; no option duplicated/dropped;
correct option still tracked.

Small feature; can land in Phase 6 (polish pass on session
mechanics) or as a sub-task of a Phase 7 stats-driven session
upgrade — whichever phase boundary opens first.

---

## N035 — Mix vs grouping: card-type ordering within a session [discussion only]

**Phase:** TBD · **Date:** 2026-05-11 · **Status:** discussion (defer)

Owner question: should the five card types (Flip / MultipleChoice /
FillIn / CodeTrap / CodeTask) intermix freely within a session, or
group by complexity (simple recall first, code tasks last)?

**Trade-off:**
- **Intermix** (current behaviour, queue order = FSRS due-order):
  better aligned with spaced-repetition interleaving research
  (Bjork, Rohrer) — interleaving improves retention vs blocking
  on identical task types. Higher cognitive load per session but
  the load IS the learning signal.
- **Grouped** (warm-up → ramp): lower cognitive load. Students
  often *prefer* it. But the preference works against the
  retention benefit; "feels easier" ≠ "learns better".

**Defer decision** until we have ≥1 user generating real data.
Worth A/B testing once the stats dashboard (Phase 7) can
distinguish session-completion rate from retention curve. Until
then: no change to queue construction.

This note is a marker, not an action item — do not file a TODO.

---

## N036 — DevTools network throttle does not propagate to Web Worker fetch [Phase 6 T6.11]

**Phase:** 6 (stop #2 findings) · **Date:** 2026-05-11 · **Status:** resolved 2026-05-12 (T6.11)

During Phase 6 stop #2 verification of the Pyodide cold-start path,
the owner's three measurement runs produced:

| Condition          | total_ms |
|--------------------|----------|
| Cold cache         | 9685     |
| Warm cache         | 5118     |
| 3G throttle        | 3455     |

The 3G number is smaller than cold cache. Reading the trace, the
likely cause is a documented Chromium quirk: DevTools network
throttling settings configured on the main thread are NOT
consistently applied to fetch requests issued from inside a
DedicatedWorker. Our Pyodide worker fetches `pyodide.mjs` + the
WASM blob + `pytest` package from within the worker; those
requests bypass the main-thread throttle and complete at unthrottled
speed.

**Implication:** the "slow-network" cold-start number from stop #2
is invalid for budget-setting purposes. The cold-cache run (9685ms)
is the real worst-case we have measured.

**Resolution:** at T6.11 (CI cold-start gate), use protocol-level
throttling rather than DevTools throttling. Concrete options:
- Playwright with `context.route(...)` adding a deliberate delay
  before passing through the request, OR
- `chrome.debugger` CDP `Network.emulateNetworkConditions` applied
  to the worker target (not just the main page target), OR
- A local stub server that serves Pyodide assets with a configurable
  delay; CI swaps the CDN to the stub.

Whichever path T6.11 chooses, the gate MUST measure under controlled
slow-network conditions, not "DevTools 3G + hope".

ADR-020 currently caps CI at 8s. Owner-machine cold-cache at 9.7s
puts that threshold under pressure already; the gate threshold will
be re-decided at T6.11 once we have CI-runner numbers. Tentative
revision: 12s (2s headroom over observed cold worst case).

**T6.11 resolution (2026-05-12):** Implemented option 1 — Playwright
`context.route('https://cdn.jsdelivr.net/**', ...)` adds an 80 ms
hop to every Pyodide CDN request. The route handler operates at the
network stack level (below the worker boundary), so the throttle
DOES propagate to fetches issued from inside the DedicatedWorker —
exactly the property we needed and that DevTools throttle lacked.
Spec: `frontend/test/cold-start.spec.ts`. ADR-020 amended: threshold
8s → 12s with rationale.

---

## N037 — Pyodide-actual e2e coverage for code_task smoke matrix [Phase 10]

**Phase:** 6 (T6.10) · **Date:** 2026-05-12 · **Status:** open

T6.10's smoke matrix (`tests/unit/test_module1_code_tasks.py`)
iterates every Module 1 code_task and asserts `solution_code` passes
its hidden `tests` via the harness. The test runs under **CPython**,
not Pyodide. This catches content/harness drift (broken solution,
mis-spelled allowlist, harness regression) but cannot catch
Pyodide-specific bugs that arise from CPython-vs-Pyodide
divergences in:
- The pytest version bundled with Pyodide vs the host's pip pytest
  (Pyodide ships pytest 8.1.1 fixed; host may diverge).
- Emscripten filesystem behaviour for `tempfile.mkdtemp` and
  `sys.path` interaction.
- Module preloading at Pyodide boot (the original ADR-019 first cut
  was bitten by this — the runtime hook was switched to static AST
  precisely because static-allowlisting of internals isn't portable).

The stop-#3 regression that the original T6.10 spec was meant to
catch (xml.etree rejection) is now structurally impossible because
the AST-based gate cannot mis-classify pytest internals. Other
Pyodide-only bugs in the same shape remain uncovered.

**Resolution path:** owner's manual stop-#4 verification covers the
Pyodide-actual happy path interactively. For automated regression
coverage, Phase 10 (or later) should add either:
- A Playwright test that drives the SPA in a headless browser,
  enters each card's `solution_code`, clicks Run, asserts the pass
  indicator renders. Heaviest but most realistic.
- A `pyodide` npm package test that runs in Node (Pyodide-in-Node
  is supported), loads the harness, iterates Module 1 cards. ~80MB
  devDep, ~10s cold-start per process. Practical alternative.

**Tentatively:** Pyodide-in-Node test, lives in `frontend/test/` as
a slow-suite vitest (`vi.setConfig({ testTimeout: 60_000 })`), runs
on-demand in CI rather than every push.

Not blocking Phase 6 close — manual stop-#4 covers the gap until
then.

**Update 2026-05-12 (P6.5/P1-2):** Partially resolved. The Playwright
spec at `frontend/test/pyodide-e2e.spec.ts` drives the T6.10 + T6.12
matrices + FR-SBX-6 against real Pyodide in CI. The Pyodide-in-Node
fallback option above is no longer needed.

---

## N038 — Vite env vars are build-time, not runtime — CI must inject [LESSON]

**Phase:** 6.5 (P6.5/P1-2 CI rollout) · **Date:** 2026-05-12 · **Status:** lesson logged

`VITE_PYODIDE_CDN` (and any future `VITE_*` env) is inlined by Vite at
**build** time, not read at runtime in the browser. Three consequences
that bit the P6.5/P1-2 CI rollout:

1. The Playwright job in `.github/workflows/ci.yml` was building
   without these env vars present, producing a `dist/` whose Pyodide
   worker correctly fired the T6.0.5 "env not set" error on first
   `runCodeTask` — clean error, but every spec failed on the same
   message.
2. The failure mode was indistinguishable from "preview wedged" at
   first because `webServer.stdout: 'pipe'` wasn't on, so the worker's
   diagnostic + error postMessages weren't visible in the job log.
3. Local works because `frontend/.env.local` ships with the values;
   CI runners have neither `.env.local` nor inherited env. The gap
   was invisible until the first push that needed Pyodide in CI.

**Resolution:** Hardcoded values injected at the playwright job's
build step in ci.yml. CDN URL is non-sensitive; version is pinned
per ADR-020. Single source of truth = workflow file. Values are
NOT committed to `.env` or `.env.example` (those stay env-set-by-
each-developer); committing values to `.env` is the alternative
path that the project deliberately doesn't take, to keep
secrets-out-of-source discipline even for non-secret values.

**Lesson + paired-commit rule:** any new `VITE_*` var must land in
**three** places in the same commit, not two:
- `frontend/.env.example` (developer-facing template)
- `frontend/.env.local` (local owner setup; per existing
  `feedback_env_var_setup_pairing` rule)
- `.github/workflows/ci.yml` build step `env:` block for any job
  that needs the var at build time

The Phase 6.5 audit already raised the analogous local-side concern
(env-var setup pairing) — the CI side is the same shape and just
got added to the rule.

**Phase 10 gate landed:** `scripts/check-vite-env-coverage.mjs` ships
in Phase 10 polish. Greps `VITE_*` references across `frontend/src/**`,
compares against `.env-example` keys, fails on either direction
(used-but-undocumented or documented-but-unused). Same shape as the
contrast/em-dash/bundle gates: regression detection at push time
instead of CI-failure time. Authoring the gate surfaced
`VITE_PYODIDE_VERSION` as orphaned documentation (declared but unread)
and that var was cleaned up in the same Phase 10 wave.

---

## N039 — Phase 1 content may have Pyodide-vs-CPython divergences [Phase 10 audit]

**Phase:** 6.5 (P6.5/P1-2 first green CI run) · **Date:** 2026-05-12 · **Status:** open

T6.12's real-Pyodide matrix surfaced its first content bug: card
`m1-s6-c11` (Implement a concurrent doubler with `asyncio.gather`)
was authored in Phase 1 against CPython semantics. Its hidden tests
call `asyncio.run(...)` from sync `def test_...` functions. CPython
creates a fresh event loop on demand; Pyodide's event loop is the JS
event loop and is always running — so `asyncio.run` raises
`RuntimeError: asyncio.run() cannot be called from a running event
loop`. Backend pytest passed because CPython, not Pyodide.

This is **not a Phase 6 architecture issue**. The Pyodide worker,
harness, allowlist, namespace reset, and timeout paths all worked
correctly — the runtime correctly reported the runtime error to the
test harness. The bug is in Phase 1's `code_task` authoring: tests
assumed CPython-compatible event-loop semantics.

**Resolution for m1-s6-c11 (P6.5):** reclassified `code_task` →
`code_trap`. The canonical `asyncio.gather` pattern is now the trap's
code_snippet (shown to the student); an MC question tests
understanding of return order (gather preserves input order vs.
as_completed) and return type (list, not tuple). The lesson is
preserved; the runtime conflict is removed by not asking the harness
to execute the code. Module 1 code_task count: 7 → 6, still well
above the ≥ 5 sanity floor.

**Phase 10 audit scope:** review all remaining `code_task` cards in
PyPrep for Pyodide compatibility. Known-risky stdlib surfaces:
- `asyncio` (entire module, especially `asyncio.run`, `Loop.run_*`)
- `threading`, `_thread`, `multiprocessing` (Pyodide is single-
  threaded; webworkers don't give Python threads)
- `subprocess`, `os.system`, `os.fork` (no process spawning)
- `socket`, `urllib.request`, `http.client` (no raw network; only
  `pyfetch`, currently disabled per SEC-SBX-2)
- File I/O outside `/tmp` (Emscripten in-memory FS quirks; mount
  points differ from real Linux)
- `time.sleep` in tests (works but blocks the JS event loop, which
  blocks worker message processing — surprising semantics)
- C-extension state that survives `sys.modules.pop` (numpy random
  seed, etc.)

**Timing recommendation:** audit before **Phase 8** (Module 2
content authoring) so the Pyodide-compatibility checklist is
established before more cards land. Each module's code_task cards
should be authored knowing the Pyodide constraints from day one,
not retrofitted after the CI test fires.

**Audit deliverable:** a short doc — `docs/PYODIDE_AUTHORING.md` or
similar — listing the risky surfaces above + a one-line "what to do
instead" for each (e.g. async lessons → `code_trap` showing the
canonical pattern; threading lessons → `flip` card on GIL
explanation; etc.). Plus a fresh sweep of Module 1's remaining 6
code_task cards to confirm none have latent divergences.

**Counts at filing:** 7 code_task cards in Module 1 pre-reclass, 6
post. Modules 2–4 not yet authored (Phase 9). Total estimated audit
surface ≈ 25 code_task cards once all modules ship; doing the
Module 1 sweep now means Phase 9 authoring has the checklist ready.

→ Promoted to PRD_code_sandbox.md §10.1 (Phase 10 T10.8)

---

## N040 — Cross-session accuracy requires outcome persistence [Phase 10 / post-MVP]

**Phase:** 7 (P7-fix, stop point #2) · **Date:** 2026-05-12 · **Status:** open

The /stats "Accuracy" tile rendered "100% (5 of 5 objective cards)"
during owner stop point #2, on a session where the owner had
deliberately answered some MC cards wrong but rated them Good ("knew
it but misclicked"). The pre-fix implementation used `rating >= Good`
as a correctness proxy. Per ADR-015 the user is *explicitly allowed*
to rate Good on a wrong answer — the metric was structurally lying.

**What's resolved (frontend, P7-fix commit ddc65a1):**
- `useSession.submitAnswer` signature widened to `(rating, outcome?)`.
- All 4 objective card renderers (MultipleChoice / CodeTrap / FillIn /
  CodeTask) compute outcome locally and pipe it through:
  - MC / CodeTrap: `chosen === card.correct_index`
  - FillIn: `every blank matched accepted_answers`
  - CodeTask: `result.ok` (all hidden tests passed)
- `objectiveLastOutcomeRef: Map<string, boolean>` replaces the
  previous rating-as-proxy ref.
- `buildDetails` computes accuracy from outcomes.
- **SessionSummary's per-session accuracy is now correct** — the
  renderer has the answer data in memory; aggregation is honest.

**What's NOT resolved (server-side):**
- `POST /api/sessions/{id}/answer` accepts `{card_id, rating,
  response_ms, idempotency_key}` — no outcome field. The Reviews row
  schema has no `outcome` column.
- Therefore **cross-session accuracy** (the aggregate "your accuracy
  across all sessions" tile) is structurally unavailable.

**Why the Accuracy tile was dropped from OverviewCards (P7-fix commit
b7a5820)** rather than backfilled with another metric: a placeholder
would obscure the real gap. Empty space is honest. The slot stays
empty until backend storage lands or until a clearly-honest
alternative emerges.

**Resolution path (if/when cross-session accuracy becomes priority):**
1. **ADR-015 amendment** — declare that outcome IS now a persisted
   signal alongside rating. Note the trust-model implication: outcome
   is still client-reported (ADR-010 / ADR-013), but the server
   stores what the client says without redaction.
2. **Schema migration** — add `outcome: bool | None` to the `reviews`
   table. Nullable because flip cards have no outcome. Backfill
   existing rows as NULL.
3. **`AnswerRequest` schema** — add optional `outcome: bool | None`
   field. Frontend already computes and pipes — wire the field into
   `api.sessions.answer` body.
4. **`StatsService` per-sphere / per-module / overview** — add an
   `accuracy_outcomes` aggregation: `count(outcome=true) /
   count(outcome IS NOT NULL)`. Distinct from the rating-based
   `retention` metric — both stay in the API, UI picks the honest one.
5. **Restore the Accuracy tile** on OverviewCards (revert the data-tile
   regression guard in OverviewCards.test.tsx), wire to the new
   aggregate.

**Effort estimate:** ≈ 1 day of focused work. Alembic migration is a
small surface; SDK + API + frontend are mechanical given the
frontend plumbing is already in place. Test surface adds ~6 cases
(SDK aggregation, integration on new field, frontend tile re-add).

**Timing recommendation:** **Phase 10 polish** — wait until the rest
of MVP-1 has shipped and the owner has used it long enough to know
whether the aggregate accuracy number is genuinely missed. Pre-flight
intuition: probably yes (it's a natural progress signal), but adding
a column to `reviews` is the kind of backend-shape decision worth
sitting with before committing.

**Until then:**
- The OverviewCards 4-tile shape is locked by `OverviewCards.test`
  asserting the Accuracy tile is absent. Any future re-add MUST flip
  that test deliberately and reference this note in the commit.
- SessionSummary's per-session accuracy stays — that's the honest
  number the user sees during the loop. Aggregate accuracy is the
  cross-session signal that needs the backend work.

---

## N041 — Footgun-pair card pattern for security/correctness anchors [AUTHORING]

**Phase:** 8 (m2-s5, m2-s6) · **Date:** 2026-05-13 · **Status:** active

Authoring pattern that emerged across `m2-s5` and `m2-s6` and is
worth replicating in remaining sphere-level security/correctness
anchors:

**Shape:** for each sphere's marquee gotcha, ship *two* cards as a
pedagogical unit:

1. A `code_trap` at difficulty 3–4 showing the vulnerable / wrong
   pattern with a concrete failure mode (rm -rf via shell injection,
   silent traceback loss from `logger.error(str(e))`). Options name
   the actual mechanism, not just "this is bad".
2. A `multiple_choice` at difficulty 2–3 right after, comparing the
   fix candidates: structural fix (canonical), alternative-but-OK,
   incomplete defense, plain wrong. The MC forces the learner to pick
   between *good* and *good-but-second-best*, not between right and
   nonsense.

**Why it works:** the trap card builds recognition ("I've seen this
bug shape before"); the MC card builds prescription ("I know the
canonical fix and why the alternatives are second-best"). Recognition
without prescription is the failure mode where junior engineers spot
the smell but propose a less-good fix in code review.

**Landed pairs:**
- `m2-s5-c2` + `m2-s5-c3` — shell injection trap + arg-list-vs-shlex
  -quote fix MC.
- `m2-s6-c2` + (planned) — argparse `type=bool` is broken. m2-s6 c2
  was a single card; the pattern wasn't yet codified. Acceptable;
  the gotcha is shallow enough that one card carries it.
- `m2-s6-c6` (single card at diff 4 carrying `logger.error(str(e))`)
  — see future-author note below.

**Future-replicate explicitly:**
- `m4-s7` SQL injection — vulnerable parameterization vs prepared-
  statement / ORM fix.
- `m4-s9` Bash `set -euo pipefail` — script-without-it trap vs
  what each flag protects against.
- Any future sphere with a marquee security or correctness gotcha
  where "recognize" and "fix" are usefully separable skills.

**Quality bar:** the MC's four options should follow the "two of four
plausibly wrong-for-an-interesting-reason" rule from `PRD_content_authoring.md`
section 6. Don't pad with "all of the above" or "none of these";
every option should be a real candidate a junior might genuinely
write.

---

## N042 — Validator emoji scan covers U+2600–U+27BF, not just colorful pictographs [AUTHORING]

**Phase:** 9 (m3-s0) · **Date:** 2026-05-13 · **Status:** active

The `_check_no_emoji` rule in `scripts/validate_content.py` uses the
regex `[\U0001F300-\U0001FAFF☀-➿]`. The `☀-➿` range expands to
**U+2600–U+27BF** — the Unicode "Miscellaneous Symbols" and "Dingbats"
blocks. This is broader than just decorative emoji: it fires on inline
status / marker glyphs like:

- `✓` (U+2713) — check mark
- `✗` (U+2717) — ballot X
- `→` (U+2192) — rightwards arrow  *(actually U+2192 is in the
  "Arrows" block U+2190–U+21FF, not the validator range; but `➜`
  (U+279C) and similar DO match)*
- `⚠` (U+26A0) — warning sign
- `☑` (U+2611), `☒` (U+2612) — ballot boxes
- `✏` (U+270F) — pencil
- `★ ☆ ♥ ♦` — playing-card and star symbols

**Authoring rule:** in lesson and card text, use plain text or
markdown formatting for emphasis. No Unicode glyphs from the
Dingbats / Miscellaneous-Symbols blocks, even as inline status
markers.

**Acceptable substitutes for common cases:**
- `✓` → `"passes"` or `"(ok)"` or markdown checklist `- [x]`
- `✗` → `"fails"` or `"(no)"` or `- [ ]`
- `→` → `"leads to"` or `"becomes"` or `-->`
- `⚠` → `"warning:"` or `**bold caution**`

**Discovery:** first-run validation rejection during `m3-s0-c8`
authoring. The card's explanation used `✓` to mark three "test
passes" scenarios; replaced with `; passes)` textual marker. Filing
this so future authoring agents don't trip the same gate.

**Related:** PRODUCT.md §1 principle ("Honest signaling over
motivational theatre") is the *spirit* of the rule (no decorative
chrome); N029 / validator's `_check_no_emoji` is the *enforcement*.
Inline status markers fall under the enforcement even when the
authoring intent is operational rather than decorative.

---

## N043 — code_task harness writes only solution.py + test_solution.py [AUTHORING]

**Phase:** 9 (m3-s3) · **Date:** 2026-05-13 · **Status:** active

Both the host validator (`scripts/validate_content.py` → `_run_code_task`)
and the Pyodide browser harness (`frontend/src/pyodide/pytest_harness.py`)
expose **only two files** to pytest at code_task execution time:

- `/<tempdir>/solution.py` — written from `card["solution_code"]`.
- `/<tempdir>/test_solution.py` — written from `card["tests"]`.

There is **no mechanism to write a third file**, including:

- `conftest.py` — pytest's auto-discovery file for cross-file fixtures
- `pytest.ini` / `pyproject.toml` — pytest configuration
- Helper modules — supporting utilities the solution would import
- `__init__.py` — package-marker files
- Data files (CSV, JSON, YAML) — fixtures loaded from disk

**Authoring implication:** any pedagogical concept that *requires* a
separate file (conftest.py, multi-module imports, package layout) must
be taught via `code_trap` / `multiple_choice` / `flip` / `fill_in`. A
`code_task` that depends on a separate file will fail at validation
time.

**Workarounds inside a code_task:**

- **Fixtures**: define `@pytest.fixture` inline in `test_solution.py`.
  Pytest discovers fixtures in the same file just as it discovers them
  in `conftest.py`. Cross-file sharing is the conftest.py feature; for
  a single-file test it's not needed.
- **Helper code**: inline into the solution or test file. Don't try to
  `from helper import ...` from a third file.
- **Test data**: embed as Python literals (dicts, lists, multi-line
  strings) in the test file. Don't load from `tests/data/*.json`.
- **Package layout demos**: skip code_task; teach via code_trap that
  shows the layout diagram in the snippet field.

**Discovered:** m3-s3 (Fixtures) authoring, verified by reading
`_run_code_task` in `src/pyprep/tools/validate_content.py`. The
constraint was inferred but not codified before m3-s3.

**Related:** the harness reuses `subprocess.run([sys.executable, "-m",
"pytest", "-q", str(td_path)])` with a 30s timeout. Tests have full
access to stdlib + any package listed in the card's `allowlist`.
Limited only by what fits in two files.

→ Promoted to PRD_code_sandbox.md §10.2 (Phase 10 T10.8)

---

## N044 — code_tasks must verify pyproject.toml deps before importing non-stdlib [AUTHORING]

**Phase:** 9 (m3-s4) · **Date:** 2026-05-13 · **Status:** active

The host validator runs code_task pytest invocations using the
project's own Python environment (via `[sys.executable, "-m",
"pytest", ...]`). Imports inside `solution.py` or `test_solution.py`
resolve against **what's installed in that env**, not against an
isolated minimal interpreter.

**Implication:** a code_task that imports `requests`, `pytest-cov`,
`numpy`, `pandas`, or any other third-party package fails at validation
time with `ModuleNotFoundError` if the package isn't in
`pyproject.toml` dependencies.

**Authoring rule:** before authoring a code_task that imports a
non-stdlib package, verify the package is in `pyproject.toml` deps.
If absent, choose one of:

1. **Switch to stdlib equivalent.** Most teaching scenarios have a
   stdlib mirror — `urllib.request` for `requests`, `http.client` for
   low-level HTTP, `subprocess` for shelling out, `csv` for CSV, etc.
   The mocking / patching / error-handling pedagogy transfers
   one-to-one.
2. **Inject the dependency as a parameter.** Instead of
   `solution.py` doing `import third_party_thing`, design the
   function to take the dependency as an argument; the test passes a
   `Mock()`. This is also better production-code shape (dependency
   injection at the boundary).
3. **Route through code_trap / multiple_choice.** The card teaches
   the same concept without executing code. Predict-the-output is
   often *better* pedagogy for library-specific behavior than asking
   the learner to write against the library.

**Discovery:** m3-s4-c9 first attempt imported `requests` directly;
validator failed with `ModuleNotFoundError: No module named 'requests'`.
Rewrote with `urllib.request` (stdlib); same patch-where-used lesson,
same difficulty rating, no harness changes. Lesson preserved.

**Currently-available third-party packages** (from `pyproject.toml`
as of 2026-05-13): `fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`,
`email-validator`, `pyyaml`, `pytest`, `pytest-cov`, `pytest-asyncio`,
`jsonschema`, `httpx`, `passlib`, `python-jose`, `python-multipart`,
`alembic`, `sqlalchemy`. Anything outside this list is unavailable
to code_task execution.

**Pyodide harness has a different constraint surface:** Pyodide
ships with its own bundled package set (numpy, pandas, matplotlib,
pyyaml, requests-like via pyfetch, etc.) but those need explicit
`loadPackage()` or `micropip.install()` calls. The host validator's
deps and Pyodide's available packages are *not the same set*. A
code_task that validates on host might fail in the browser if its
imports aren't in Pyodide's allowlist. Default to stdlib where
possible to dodge both constraints at once.

**Related:** N039 (Pyodide-vs-CPython divergences), N043 (single-
file harness constraint). The three together form the emerging
"code_task authoring constraints" cluster; promotion to a dedicated
appendix in `PRD_code_sandbox.md` is on the post-Module-4 polish
todo list per owner brief.

→ Promoted to PRD_code_sandbox.md §10.3 (Phase 10 T10.8)

---

## N045 — Schema explanation-field naming: code_trap vs multiple_choice [AUTHORING]

**Phase:** 9 (m3-s5 + m4-s1) · **Date:** 2026-05-13 · **Status:** active

The card schema (`content/schema/card.schema.json`) splits the
explanation surface by card type:

- **`code_trap`** requires `explanation_md` — *one* prose block
  attached to the card as a whole.
- **`multiple_choice`** requires `option_explanations` — an *array
  of per-option strings*, one explanation per option.

The shapes serve different pedagogies: code_trap teaches a single
mechanism around a snippet (the explanation explains the trap and
the fix); multiple_choice teaches discrimination between four
options (each option gets its own explanation of why right or
wrong).

**Authoring footgun:** when a card has both (a) a code snippet
*and* (b) per-option explanations, you can't legally type it as
either of:

- `code_trap` with `option_explanations` → schema rejects: missing
  `explanation_md`.
- `multiple_choice` with `explanation_md` → schema rejects: missing
  `option_explanations`.

**Two fix paths:**

1. **Type = multiple_choice + code in the question.** Embed the
   snippet in the `question` field as a fenced markdown block;
   provide `option_explanations`. Cards like `m3-s5-c6` and
   `m4-s1-c10` use this shape — the code is part of the question
   prose, the per-option explanations live where the schema wants.
2. **Type = code_trap + single explanation_md.** Drop the per-option
   shape entirely; one prose block at the bottom explains the trap
   + correct answer. Use when the four options are mostly
   throwaway and the explanation is one logical narrative.

**Heuristic:** if the four options each deserve a distinct rebuttal
naming their specific wrongness, you have a multiple_choice. If
the four options exist mainly to make the trap recognizable and
the explanation is one story about the trap, you have a code_trap.

**Discovery:** flagged at `m3-s5-c6` (caught during validation,
fixed by converting code_trap → multiple_choice + code-in-question).
Recurred at `m4-s1-c10` (same shape, same fix). Two instances in
two modules is enough to codify.

**Quality note:** when converting code_trap → multiple_choice, the
code that was in `code_snippet` must move into the `question`
string as a fenced block. Don't leave `code_snippet` as an extra
key on a multiple_choice card; the schema allows unknown keys but
the renderer may double-show.

→ Promoted to PRD_code_sandbox.md §10.4 (Phase 10 T10.8)

---

## N046 — Cross-card reinforcement pattern [AUTHORING]

**Phase:** 9 (m4-s2 + m4-s3 + m4-s4) · **Date:** 2026-05-13 · **Status:** active

Authoring pattern that emerged across three consecutive Module 4
spheres (Linux Ops, Docker, SQL) on distinct subject matter, with
the same shape each time. Stable enough to codify.

**Shape:** within a sphere — or across closely related spheres —
multiple cards layer different facets of one underlying principle.
Each card stands alone (pedagogical isolation preserved, since
the scheduler may resurface them weeks apart in unrelated review
sessions). The reinforcement is delivered through
**explicit cross-references in `explanation_md` /
`answer_explanation_md` / `option_explanations`**, citing related
card IDs and naming the shared principle. When a learner happens
to encounter the thread sequentially, the explanations stitch a
multi-card mental model; when they encounter them in isolation,
each card is still self-contained.

**Why it works:** complex principles (signal handling, NULL
semantics, idempotency, atomic-rename safety, layer caching) have
multiple natural manifestations across the curriculum. A single
card cannot do justice to a principle that recurs across five
operationally distinct contexts; spreading the load across cards
in different sub-tasks matches how the principle actually appears
in production work. The cross-references give learners the
"oh, that's the same thing" moment without forcing them to
encounter the cards in any particular order.

**Landed threads:**

- **m4-s2 signal handling** (within-sphere, three cards across
  t5+t6): c14 SIGTERM/SIGKILL escalation → c15 SIGHUP/SIGINT
  vocabulary → c18 SIGHUP for fd-release prevention (cross-
  references c14 and c15 explicitly in its explanation).
- **m4-s3 → m4-s2 cross-sphere signal continuation:** m4-s3-c8
  (CMD shell-form makes `sh` PID 1, which doesn't forward SIGTERM)
  cites m4-s2-c14 and m4-s2-c15 as the vocabulary it builds on.
  The Docker PID-1 context is the *application* of the signal
  vocabulary built in m4-s2.
- **m4-s3 incident-and-prevention pair** (within-sphere, two cards
  across t1+t5): c3 (`docker rm` deletes the writable layer, data
  is gone) names the incident; c14 (named volumes survive `docker
  rm`) names the prevention. c14's explanation explicitly links
  back to c3 by ID.
- **m4-s4 NULL semantics** (within-sphere, four cards across
  t1+t3+t5): c2 establishes three-valued logic (WHERE = NULL fails);
  c8 applies it to COUNT (NULLs excluded except in COUNT(*)); c9
  applies it to AVG (denominator is non-NULL count); c15 applies
  it to NOT IN (single NULL poisons the entire IN-list comparison).
  c15's explanation_md names c2 as foundation and lists all four
  cards as a deliberate thread.
- **m4-s4 aggregation-timing** (within-sphere, three cards across
  t1+t3+t4): c1 WHERE row-level filter → c10 GROUP BY collapse →
  c11 WHERE-vs-HAVING evaluation order. c11 explicitly cites c1,
  c2, c10 in its option explanations.

**When to apply:**

- Concept has multiple natural manifestations across distinct
  operational contexts.
- Cards within different sub-tasks naturally touch the same
  principle (don't manufacture this — observe it).
- Reinforcement happens through explanation cross-references, NOT
  by repeating card content.
- The thread spans at least three cards (two-card pairs are
  better handled by [[N041]] footgun-pair pattern instead).

**When NOT to apply:**

- Forcing threads where the natural connection doesn't exist —
  cards should stand independently first; threading is additive,
  not load-bearing.
- Cross-references that duplicate card content rather than
  connecting distinct facets. If c8 and c15 both teach "NULL is
  unknown", one of them is redundant. Each card should teach a
  *distinct* manifestation; the cross-reference names the shared
  principle without re-teaching it.
- Cards within a single sub-task — those naturally share context
  through the lesson text; cross-card threading shines when the
  cards live in different sub-tasks or different spheres.

**Authoring discipline:**

- Cross-references go in `explanation_md` (code_trap),
  `option_explanations` (multiple_choice), or
  `answer_explanation_md` (flip). Never in the question or option
  text itself — the citation is a "for further study" hint, not
  part of the answer the learner is expected to recall.
- Cite by ID (e.g., `m4-s2-c14`), not by topic — IDs are stable;
  topics may be rephrased in future polish.
- Name the shared principle once, typically in the *last* card of
  the thread. The card that closes the thread is the natural place
  to step back and say "this is the same principle in three
  contexts".

**Discovery:** observed first in m4-s2 (signal-handling triple),
strengthened in m4-s3 (cross-sphere signal continuation +
incident-prevention pair), confirmed in m4-s4 (NULL thread
spanning four cards across three sub-tasks). Three consecutive
spheres on operationally distinct subject matter (Linux ops,
Docker, relational SQL) showing the same shape; codifying.

**Related patterns:**

- [[N041]] footgun-pair: two cards as a unit (recognize-the-bug +
  pick-the-fix). N046 is the multi-card generalization for
  principles too big for one pair.
- Composite-distractor (within MC cards): one option contains the
  trap, three others test discrimination. N046 is the
  *cross-card* extension of the same idea — one card per facet,
  rather than four options per facet.

Future sphere authors: observe whether the thread emerges
organically before authoring it deliberately — manufactured
threads fail the "stands alone" test and produce cards whose
cross-references load-bear what should be the card's own
pedagogy.

---

## N047 — Obviously-fake placeholders for credential teaching examples [AUTHORING]

**Phase:** 9 (m4-s8) · **Date:** 2026-05-14 · **Status:** active

When a card or lesson includes a credential value as part of a
teaching example (hardcoded API key in a workflow file, leaked
token in an incident scenario, JWT, bcrypt hash, AWS access key,
GitHub PAT, etc.), the placeholder text MUST be obviously fake
on visual inspection. Realistic-looking values are forbidden even
when they're invented from scratch.

**Discovery:** m4-s8-c11 (hardcoded-secret-in-workflow-file
incident scenario) was authored with a placeholder that looked
plausibly like a real API key. GitHub push protection blocked the
push at `git push` time, flagging the value as a potential leaked
credential. The placeholder was rewritten to
`REDACTED_FAKE_API_KEY_FOR_TEACHING` and the push went through.
Push protection's false positive was the right call given how
realistic the placeholder looked — the same shape would have made
human readers wonder "is this a real key?" too.

**The rule:** credential-shaped strings in teaching content must
fail every realistic-secret heuristic:

- **API keys / tokens:** use `REDACTED_FAKE_*_FOR_TEACHING`,
  `EXAMPLE_KEY_NOT_REAL`, or descriptive sentinels like
  `<your-api-key>`. Never a random-looking 32+ char alphanumeric
  blob.
- **JWTs:** truncate to a short prefix with `...` —
  `eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo0Mn0.aBcDeF...`
  (where the payload decodes to the teaching example
  `{"user_id":42}` and the signature is obviously short / fake).
- **Password hashes (bcrypt, argon2):** don't include literal
  hash values; describe the shape in prose
  (`$2b$12$<22-char-salt><31-char-hash>`) or use clearly
  non-functional examples.
- **AWS / GitHub / Stripe / Slack tokens:** avoid the real prefix
  patterns (`AKIA*`, `ghp_*`, `sk_live_*`, `xoxb-*`) entirely.
  These prefixes trigger every secret scanner on the planet.
- **Git SHAs:** real SHAs are fine when teaching SHA-pinning
  (e.g., `actions/checkout@<real-sha>` is the *correct* practice
  to teach). A SHA isn't a secret; it's a public commit
  identifier. The rule applies to *credentials*, not to public
  identifiers that look hex-shaped.

**Why this matters operationally:**

1. **Push protection / pre-commit hooks block the push.**
   `detect-secrets`, `gitleaks`, `trufflehog`, GitHub push
   protection, Vercel deploy scanning — all flag realistic-shape
   values. A teaching example that triggers them costs author
   time (failed push, rewrite, re-push) at minimum, and can be
   blocking in CI environments.
2. **Reader cognitive load.** A reader seeing a realistic-looking
   credential in a teaching example has to mentally answer "is
   this a real leak? Should I rotate something?". Obviously-fake
   values eliminate that question.
3. **Accidental collision risk.** A randomly-generated
   real-looking key could collide with a real credential
   somewhere in the world (vanishingly small probability, but
   non-zero). Sentinels like `REDACTED_FAKE_*` cannot collide
   with anything real by construction.

**Sweep result (2026-05-14, Module 4 close):** ran secret-shape
greps across all four shipped modules
(`m1`–`m4`) for AWS / GitHub / Stripe / Slack / Google API key
prefixes, full-length JWTs, bcrypt/argon2 hash shapes, and 40+
char hex strings. Only legitimate hits: the
`REDACTED_FAKE_API_KEY_FOR_TEACHING` placeholder in m4-s8-c11
(this rule applied correctly), the truncated JWT teaching
example in m4-s7-c7 (within the rule), a real
`actions/checkout` git SHA in m4-s8-c5 (public identifier, not a
credential), and an IEEE-754 binary expansion of `0.1` in
m3-s1 (math, not a hash). No retrospective fixes required.

**Related:** N029 / `_check_no_emoji` is the validator-enforced
authoring discipline; this rule (N047) is *not* validator-enforced
— it relies on push protection / external scanners + authoring
discipline. Promotion to validator-level enforcement is a
candidate future enhancement: add a `_check_no_realistic_secret`
rule to `scripts/validate_content.py` that flags strings matching
`AKIA*`, `ghp_*`, `sk_live_*`, `^eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+$`,
and the bcrypt/argon2 hash shapes. Deferred to Phase 10 polish.

**Cross-references:** [[N029]] (validator-enforced authoring
discipline pattern). The placeholder shape in m4-s8-c11
illustrates the rule operationally.

→ Promoted to PRD_code_sandbox.md §10.5 (Phase 10 T10.8)

---

## N048 — T10.6 Lighthouse baseline closed; Tier 2 deferred post-MVP-1

**Phase:** 10 (T10.6) · **Date:** 2026-05-14 · **Status:** closed

(Commits e686879/6034a65/a7bd0b9 carry `p10.n037` prefix from a
mislabel in the prior chat's handoff brief. The literal N037 identifier
was already taken for the Pyodide-actual coverage gap resolved in
P6.5/P1-2 — see existing NOTES.md L245/L269. Work tracked under T10.6
in TODO.md; this entry reconciles the naming.)

Final scores on `/login` prod Desktop (vite preview, no backend):
P99 / A100 / BP92 / SEO100. Core Web Vitals all green
(LCP 0.8s, FCP 0.6s, TBT 0ms, CLS 0, SI 0.6s).

Floor analysis (why scores plateau where they do):
- BP 92 capped by two audits:
  - errors-in-console (8 items) — CORS to offline backend at :8000.
    Resolves to 0 when backend is up with proper CORS for :4173.
  - inspector-issues (1 item) — CSP violation. Requires prod hosting
    policy decision before fixable (Tier 3).
- P 99 within run-to-run noise. unused-javascript reports 1058 KiB
  potential savings but score remains 99 — login route uses ~30% of
  main bundle, splitting would help /session and /stats more.

Deferred items (tracked, not blocking MVP-1):

1. **Tier 2: route-level code splitting** — TanStack `createLazyFileRoute`
   for HomePage, SessionPage, StatsPage, ModuleDetailPage, LessonPage,
   LoginPage + dynamic imports for codemirror, shiki, react-markdown
   inside their respective routes. Justification gated on /session prod
   LCP measurement (predicted 1.5-2.5s post-minification — likely still
   green band). Re-evaluate post-MVP-1.

2. **/session and /stats prod audit with auth** — requires backend running
   with CORS configured for :4173. Owner has backend startup command
   (PYPREP_SECRET_KEY + PYPREP_SINGLE_USER + PYPREP_SINGLE_USER_PASSWORD
   env vars + `uv run pyprep-api`). Audit deferred post-MVP-1.

3. **CSP header (Tier 3)** — blocks BP→100. Requires prod hosting
   context (Netlify/Vercel/self-host) before policy can be written.
   Defer until deployment target chosen.

Commits in this wave:
  e686879  Tier 1   (meta description, robots.txt v1, hidden sourcemaps)
  6034a65  Tier 1.5 (sourcemap mode correction, remove robots.txt v1)
  a7bd0b9  Tier 1.6 (robots.txt v2 with Allow:/)
  <this>   N037 closure

Net Lighthouse delta from dev-server baseline:
  Performance:    63 → 99   (+36)
  Best Practices: 96 → 92   (-4, floor reasons above)
  SEO:            82 → 100  (+18)
  Accessibility:  100 → 100 (unchanged)

---

## N051 — Stats-S2 benchmarks/trends deferred (backend dependency) [Phase 11 / post-MVP-1]

Filed during Phase 10.5 close (2026-05-15) from `PYPREP_DESIGN_REVIEW_RESPONSE.md` Stats-S2.

Design review recommended adding **benchmark targets** (e.g., "your retention 78% vs target 80%") and **trend deltas** (e.g., "+12 reviews this week vs last week") to the `/stats` metric tiles. Cannot be implemented as a frontend-only change.

**Why it's a backend dependency:** `/api/stats/me/overview` currently returns a current-state snapshot only — `reviews_total`, `retention_rate`, `streak_days`, `xp`, `orphan_review_count`, `total_seconds`. No historical series, no baseline constants, no period-over-period deltas. Frontend can render whatever it's served, but it cannot synthesize trends from a single scalar.

**Resolution paths (any one is sufficient):**

1. **Extend `Overview` schema** with `reviews_last_7d`, `reviews_prev_7d`, `retention_7d_delta` (and similar for 30d). Cheap if the underlying `reviews` rows are still queried per-request; expensive if PRD progress §3.3 on-the-fly computation has to be re-derived twice.
2. **Hardcode benchmark constants** in the response (`target_retention=0.80`, `target_daily_reviews=20`). Cheapest path; ships a number to compare against without historical data. Owner decides whether benchmarks are honest without per-user calibration.
3. **New `/api/stats/me/trend` endpoint** returning a 30-day or 90-day series. Most flexible (powers calendar heatmap densities + trend tiles + Phase 11 module drill-down), but largest scope.

**Recommendation:** path (3) is most aligned with the calendar-heatmap pattern that landed in S1 (`7ee5142`) — both consume the same shape (daily reviews series). Bundling S2 with the trend endpoint avoids two schema migrations. Defer to Phase 11 or first post-MVP-1 iteration.

**Cross-refs:** PRD progress §3.3 (on-the-fly stats computation); commit `7ee5142` (S1 calendar heatmap, currently consumes 30-day window from existing fields).

---

## N052 — Card content with raw markdown fences not rendered [Phase 11 / content quality]

Surfaced during Phase 10.5 visual verification (2026-05-15).

Owner observed cards in **Module 4 SQL spheres** (m4-s4 and m4-s7) rendering with literal triple-backtick fences ` ```sql ... ``` ` visible in the prompt body, rather than as syntax-highlighted code blocks. Behavior is inconsistent with how lesson bodies render code (which goes through the markdown processor + Shiki).

**Likely root causes** (one or both):

1. **Renderer gap:** the card prompt field is rendered as plain text or with a markdown subset that doesn't process fenced code blocks. Lesson body uses a different render path that does.
2. **Schema/authoring gap:** card schema has no dedicated `code_block` field, so authors who needed to show code in the prompt embedded it as inline markdown fences. The card type spec assumes prose-only prompts.

**Audit scope:** start with m4-s4 (NULL semantics, aggregates) and m4-s7 (web security, SQL injection). Pattern likely repeats anywhere a card's pedagogy hinges on showing a SQL snippet inside the prompt rather than as a separate `code_snippet` field (which `code_trap` cards already have).

**Resolution paths:**

- **(a) Schema-level:** add explicit `code_block` or `prompt_code` field to the relevant card-type schemas; migrate affected cards. Cleanest, but requires a content migration pass.
- **(b) Renderer-level:** route card prompts through the same markdown processor as lesson bodies. Smaller diff, but assumes every existing prompt is markdown-safe (no accidental triple-backticks).
- **(c) Content sweep:** rewrite affected cards to put the SQL into the existing `code_snippet` field (where applicable) or as a separate explanatory sub-card. No code changes; pure content work.

**Recommendation:** path (a) is most architecturally honest — prose and code have different presentation rules and the schema should reflect that. Defer to Phase 11 / content quality pass.

**Cross-refs:** N039 (Phase 1 content audit precedent for content-shape fixes); validator `_check_card_shape` rules in `scripts/validate_content.py`.

---

## N053 — Lesson code blocks overflow horizontally [Phase 11 / ship-packaging]

Surfaced during Phase 10.5 visual verification (2026-05-15).

Owner observed long SQL lines in `LessonReader` code blocks require horizontal scroll on standard desktop viewports (≥ 1280px). Primary study flow friction: readers either scroll the block independently of the prose (loses context) or are forced to read truncated lines. Pattern affects any lesson with multi-clause SQL, long pandas chains, or wide CLI invocations.

**Architectural root cause:** lesson prose container is `max-w-3xl` (768px) for readability of prose; code blocks inherit that constraint. Code legibility wants more width than prose legibility allows.

**Mitigation approaches (none trivial, all viable):**

- **(a) Smaller font in lesson code:** drop `text-sm → text-xs` inside `pre` blocks. ~15% more characters per line. Partial fix; still overflows on the longest lines but reduces frequency. Cheapest.
- **(b) Break code blocks out of the prose container width:** code blocks span beyond `max-w-3xl` while prose stays narrow. Architectural change to `LessonReader` layout (likely requires CSS Grid or a wrapper component). Cleanest visually; most invasive.
- **(c) Author-side reformatting:** break long SQL into one clause per line; break long pandas chains at `.` boundaries. Content work, no code changes. Owner-time-intensive; doesn't catch future regressions.
- **(d) Combo of (a) + (c):** smaller font + author hygiene catches most cases without architectural risk.

**Recommendation:** path (d) for ship-packaging wave (low risk, low cost, ships immediately); revisit (b) if reader feedback signals overflow is still common.

**Cross-refs:** `frontend/src/features/lessons/LessonReader.tsx`; Phase 10.5 commit `6cfe85e` (`Section` card chrome, same prose-container family).

