# Contributing to PyPrep

## The pre-push hook is the source of truth for CI

Run this once per clone, right after `uv sync` + `pnpm install`:

```bash
uv run pre-commit install --hook-type pre-push
```

After that, every `git push` runs the same checks CI runs, in the same
order, against the same code. **A passing pre-push means CI will pass
for the same reasons.** If pre-push goes green and CI goes red, that's
a bug in this contract — file an issue rather than re-running.

The hook chain:

| Step | Command | What it catches |
|---|---|---|
| ruff | `uv run ruff check .` | lint, import order, security lints (S-rules) |
| mypy | `uv run mypy` | strict type-check on `src/pyprep/sdk` and `src/pyprep/api` |
| file-size | `uv run python scripts/check_file_size.py` | files >150 LOC of code |
| handler-LOC | `uv run python scripts/audit_handlers.py` | route handlers >10 logic LOC without a NOTES waiver |
| frontend ESLint | `pnpm --dir frontend lint` | TS/TSX style + react-hooks rules |

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
