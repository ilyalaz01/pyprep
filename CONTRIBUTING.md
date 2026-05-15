# Contributing to PyPrep

## Status

PyPrep is a single-contributor MVP-1 project. Public contribution is post-launch. The pre-push hooks below mirror CI gates and exist for owner discipline during active authoring — they're not a contributor-submission gate. See `README.md` for project goals and architecture overview.

## The pre-push hook is the source of truth for CI

Run this once per clone, right after `uv sync` + `pnpm install`:

```bash
uv run pre-commit install --hook-type pre-push
```

After that, every `git push` runs the same checks CI runs, in the same
order, against the same code. **A passing pre-push means CI will pass
for the same reasons.** If pre-push goes green and CI goes red, that's
a bug in this contract — file an issue rather than re-running.

The hook chain (10 gates):

| # | Gate | Scope |
|---|---|---|
| 1 | `ruff` lint | backend Python (lint, import order, security S-rules) |
| 2 | `mypy` strict | SDK + API (`src/pyprep/sdk`, `src/pyprep/api`) |
| 3 | File size ≤ 150 LOC | `src/` |
| 4 | Handler logic ≤ 10 LOC | API handlers (NOTES-waivered exceptions only) |
| 5 | ESLint | frontend |
| 6 | `tsc -b` | frontend (build-mode catches lib/refs mismatches) |
| 7 | WCAG AA contrast | theme tokens |
| 8 | Em-dash content lint | no U+2014 in shipped content/code copy |
| 9 | Vite env coverage | `VITE_*` references must exist in `.env-example` |
| 10 | Bundle size | raw ≤ 2 MB, gzip ≤ 600 KB (per ADR-022) |

Coverage is enforced separately via `pytest --cov-fail-under=85` (configured in `pyproject.toml`), not by the pre-push hook.

Each hook is fast (<5s typical) so the whole gate runs in well under a
minute. If a hook fails, `git push` is aborted — fix the issue, stage
the fix, push again.

### Why pre-push and not pre-commit?

- Type-check + LOC + handler-audit need a clean snapshot of the whole
  repo, not just staged files. Running them on every commit (including
  WIP commits) creates friction without proportional value.
- Push is the right boundary: it's the moment work leaves the local
  workstation. Once it's pushed, CI and reviewers see it.

### Bypassing (don't)

`git push --no-verify` bypasses the hook. Reserve for exceptional cases
(emergency rollback, CI-config-only changes that can't run hooks). If
you do bypass, mention it in the PR/commit message so reviewers know.

### CI does not run pre-commit

CI runs each underlying command directly via `.github/workflows/ci.yml`.
The pre-push hook is dev-side scaffolding that mirrors CI; CI is the
ground truth, pre-push is the local mirror. Both layers exist so the
"oops, CI is red" loop closes at push time, not 90 seconds later.

## Anything else worth knowing

- `docs/CLAUDE_CODE_INSTRUCTIONS.md` — workflow per task, hard rules,
  step-back rule. Read this first if you're touching code.
- `docs/PRD.md` + `docs/PLAN.md` — product spec + architecture (ADRs).
- `docs/NOTES.md` — engineering notes (small bootstrap-vs-reality
  discrepancies and resolutions). Append here for anything that
  doesn't merit a full ADR.
- `PRODUCT.md` + `DESIGN.md` — Impeccable design context. Frontend
  changes should honor `DESIGN.md` tokens (no magic Tailwind colors).
