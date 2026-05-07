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
