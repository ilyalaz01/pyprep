# Claude Code — Operating Manual for PyPrep

**This is your binding spec when working on this repository.** Do not skip rules. Do not "improve" the architecture without writing it down first.

---

## 0. First Action on a Fresh Session

When the user opens a new Claude Code session in this repo, **before touching any code**:

1. Read in order: `docs/PRD.md`, `docs/PLAN.md`, `docs/TODO.md`.
2. Read whichever sub-PRD applies to your current task:
   - Working on scheduler? → `docs/PRD_spaced_repetition.md`
   - Working on code execution? → `docs/PRD_code_sandbox.md`
   - Working on stats? → `docs/PRD_progress_tracking.md`
   - Working on prompts? → `docs/PRD_mock_interview_prompts.md`
   - Authoring content? → `docs/PRD_content_authoring.md`
3. State out loud (in your reply): "I read PRD §X, PLAN §Y, TODO Phase Z, and PRD_<sub>. I will work on task T<id>." — proves you grounded yourself.

If a doc is missing or stale, **stop and ask**. Do not make assumptions silently.

---

## 1. Workflow per Task

```
┌── pick task from TODO.md (lowest unchecked ID in current Phase) ─┐
│                                                                   │
│  → flip status to 🟡 in TODO.md and commit "chore: start TX.Y"   │
│                                                                   │
│  → write failing test FIRST (RED)                                 │
│      git commit -m "test(pX): TX.Y add failing test"              │
│                                                                   │
│  → write minimum code to pass (GREEN)                             │
│      git commit -m "feat(pX): TX.Y impl"                          │
│                                                                   │
│  → refactor for clarity (REFACTOR)                                │
│      git commit -m "refactor(pX): TX.Y cleanup"                   │
│                                                                   │
│  → run gate: ruff check, pytest --cov, file-size check            │
│      if any fails → fix, do not skip                              │
│                                                                   │
│  → flip status to ✅ in TODO.md, append note if anything notable │
│      git commit -m "chore: complete TX.Y"                         │
└───────────────────────────────────────────────────────────────────┘
```

**Commit per step.** A single PR-equivalent that mixes test+code+chore commits is welcome — but do not squash everything into one giant blob.

---

## 2. Hard Rules (cannot be relaxed)

| # | Rule | How to verify |
|---|---|---|
| 1 | No file in `src/` or `frontend/src/` exceeds **150 LOC** (blanks & comment-only lines excluded). | `python scripts/check_file_size.py` |
| 2 | All business logic accessed via the **SDK layer** (`src/pyprep/sdk/`). REST handlers ≤ 10 LOC of logic each. | Code review |
| 3 | **TDD for SDK code**: failing test first, every time. | Commit history shows test before impl |
| 4 | No `print()` in production code. Use `structlog` logger. | `ruff` rule `T201` |
| 5 | No hardcoded secrets, URLs, paths. Use `Settings` (pydantic-settings) reading from env. | `ruff` + manual review |
| 6 | Coverage ≥ 85% project-wide; ≥ 95% on `scheduler/` and `stats/`. | `pytest --cov` |
| 7 | Zero `ruff check` violations. | CI |
| 8 | No server-side execution of user Python code. Pyodide only. | Architecture review on every PR touching code-task code |
| 9 | No paid LLM API calls in app runtime. Mock interviews are prompt-generators only. | Code review |
| 10 | `uv` is the only Python package manager. Never `pip install` directly. | `pre-commit` hook checks `uv.lock` is current |

---

## 3. The "Step Back" Rule

Every **3 completed tasks** OR every **end of phase**:

1. Stop coding.
2. Re-read `PLAN.md` §1–4 (architecture diagrams).
3. Ask yourself: "Does what I just built still match the diagrams?"
4. If yes → continue. If no → either update the diagrams *and* write an ADR explaining the divergence, or revert.

This is the closest thing to a "self-review agent" the project needs at MVP. Real reviewer-agents come post-MVP if useful.

---

## 4. When You Are Stuck

In order:

1. **Re-read the relevant PRD section.** 80% of "stuck" is forgetting a constraint.
2. **Search the codebase** for prior solutions or related patterns. Don't re-invent.
3. **Look at the test you wrote.** If the test is unclear, the design is unclear. Fix the test first.
4. **Reduce to the smallest failing case.** A 5-line repro tells you more than 50 lines of speculation.
5. **Write a one-paragraph "stuck note"** in `docs/STUCK.md` (create if missing): what you tried, what didn't work, what you suspect. Then post in your reply: "I am stuck on TX.Y, see STUCK.md." Wait for owner.

Never "guess and check" by trying random alternatives in production code. Stuck → think → write → ask.

---

## 5. Content Generation Sub-Workflow

When generating cards for Modules 2–4 in Phase 9:

1. Open `docs/PRD_content_authoring.md`. **Re-read it.** Authoring rules drift fast.
2. Open `content/modules/01_python_core_oop/00_fundamentals.cards.json`. This is the **gold sample**. Match its tone, structure, and difficulty distribution.
3. Generate **one sphere at a time**, not a whole module in one shot.
4. After generation, run `scripts/validate_content.py` immediately. Fix violations before writing the next sphere.
5. Spot-check 5 random cards: does each one mirror real interview wording? If not, regenerate that card.
6. Commit: `content(p9): T9.X module N sphere M cards`.

---

## 6. What "Done with a Phase" Means

The phase-end review checklist at the bottom of `docs/TODO.md` is binding. Run it. Tick every box. If a box can't be ticked, the phase isn't done.

---

## 7. Communication With the Owner

The owner reads your replies, not just your commits. In each reply:

- **Lead with what changed**, not what you're about to do.
- Reference task IDs (`T2.4 done`).
- If you made an architectural call, **explicitly flag it**: "I chose X over Y because Z. If you want me to revert, say so."
- Keep replies short. Owner trusts you to do the work; long status reports waste tokens.

---

## 8. Forbidden Behaviors

- ❌ "Improving" the architecture by silently restructuring `src/`. Architectural changes require a new ADR appended to `PLAN.md`.
- ❌ Adding dependencies that are not in `pyproject.toml` already. Adding a dep is a mini-decision; document it.
- ❌ Skipping tests because "it's obvious".
- ❌ Mass-rewriting working files for stylistic reasons.
- ❌ Generating content without the validator pass.
- ❌ Marking a task ✅ when CI is red.

---

## 9. End-of-session Habit

Before the owner closes the session, **always**:

1. Push or stage all commits.
2. Update `docs/TODO.md` to reflect actual status.
3. Append a one-paragraph entry to `docs/SESSION_LOG.md` (create if missing): "Date — task IDs touched — status — open questions for next session."

This makes the next session 10× cheaper.
