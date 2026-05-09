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
