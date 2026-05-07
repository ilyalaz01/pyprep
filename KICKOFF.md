# PyPrep — Claude Code Kickoff

Paste the prompt below into your **first** Claude Code session, in the project root. It tells Claude Code where to ground itself and what to do.

For every subsequent session, just say: *"Continue from where we left off. Read docs/SESSION_LOG.md, pick up from current TODO state."*

---

## ⬇️ Copy from here ⬇️

```
You are working on PyPrep — a focused Python interview prep web platform.

GROUND YOURSELF FIRST (before any code):

1. Read docs/CLAUDE_CODE_INSTRUCTIONS.md — your operating manual. It is binding.
2. Read docs/PRD.md — what we're building and why.
3. Read docs/PLAN.md — architecture, C4 diagrams, ADRs.
4. Read docs/TODO.md — task list.

After reading, post a brief reply:
- One paragraph confirming what you understood about the project.
- The first task ID you will work on (it must be the lowest unchecked task in Phase 0).
- Any clarifying questions BEFORE starting code. Do not start until I confirm.

WORK RULES (excerpt — full rules in CLAUDE_CODE_INSTRUCTIONS.md):

- Phase order is binding. Finish Phase 0 before Phase 1, etc.
- TDD for any code under src/pyprep/sdk/. Failing test first, every time.
- No file > 150 LOC of code (blanks/comments excluded).
- Coverage ≥ 85% project-wide; ≥ 95% on scheduler/ and stats/.
- Zero ruff violations.
- All business logic via the SDK layer. REST handlers ≤ 10 LOC of logic.
- No print() in production code.
- No paid LLM API calls in app runtime.
- No server-side execution of user Python code (Pyodide only).
- uv is the only Python package manager.

WHEN STUCK: write a stuck-note in docs/STUCK.md, then stop and ask me.

EVERY 3 TASKS OR EVERY PHASE END: stop, re-read PLAN.md §1-4, confirm the
architecture still matches reality, then continue.

End-of-session habit: update docs/TODO.md and append to docs/SESSION_LOG.md
(create if missing) before I close the session.

Begin grounding now.
```

## ⬆️ Copy to here ⬆️

---

## Tips for working with Claude Code on this project

- **Don't review every commit.** Trust the agent on small steps. Review at phase boundaries — that's where the architecture matters.
- **If output drifts from docs**, reply: *"Stop. Re-read PRD.md §X and CLAUDE_CODE_INSTRUCTIONS.md. State what's different from what you just did, then propose a fix."*
- **For content generation (Phase 9)**, paste into Claude Code: *"Generate cards for sphere `m2-s4` following docs/PRD_content_authoring.md. Match tone of `content/modules/01_python_core_oop/00_fundamentals.cards.json`. After generation, run `uv run validate-content` and fix any errors."*
- **For mock-interview prompt iteration**, after running ≥ 3 real mocks, paste the failure cases and ask Claude Code to evolve `template_v1.md` → `template_v2.md`.
- **Don't let Claude Code add dependencies silently.** If you see `pyproject.toml` change in a commit, read the new dep and confirm it's needed.

---

## Anti-patterns to call out immediately

If Claude Code does any of these, push back hard:

| Anti-pattern | Reply |
|---|---|
| Files growing past 150 LOC "for clarity" | "Split per Segal §2.2. No exceptions." |
| Business logic in REST handlers | "Move to SDK. Handler ≤ 10 LOC of logic." |
| Tests written after the implementation | "Revert. TDD is mandatory for SDK code." |
| Adding a UI component library (MUI, Chakra, etc.) | "Reverted by ADR-008. Tailwind only." |
| Calling a paid LLM API | "Reverted by ADR-005. Generate prompts, don't call APIs." |
| Server-side `exec` of user code | "Reverted by ADR-001. Pyodide only, ever." |
| `print()` in production code | "Use structlog logger." |
| Hardcoded secrets / URLs | "Move to Settings (pydantic-settings)." |

---

Ready. Open Claude Code in this directory and paste the kickoff prompt above.
