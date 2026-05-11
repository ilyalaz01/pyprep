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

**Phase:** 6 (stop #2 findings) · **Date:** 2026-05-11 · **Status:** open

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

