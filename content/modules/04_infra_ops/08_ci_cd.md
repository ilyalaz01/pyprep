---
module_id: 4
sphere_id: "m4-s8"
title: "CI/CD Pipelines"
title_ru: "CI/CD пайплайны"
estimated_minutes: 15
prerequisites: ["m4-s5"]
tags: ["ci", "cd", "github-actions", "yaml", "automation", "secrets", "interview-classic"]
---

# CI/CD Pipelines

Every modern dev team uses some form of pipeline (GitHub Actions, GitLab CI, Jenkins, CircleCI). "Have you written a CI workflow?" is now the same shape of question as "have you read a Dockerfile?" a few years ago — baseline literacy, not exotic skill. This sphere uses GitHub Actions as the lingua franca because it's the most common stack at Israeli hi-tech in 2026; the patterns transfer to other CI systems with mostly syntactic changes. The bar is reading an existing `ci.yml`, explaining what runs when, knowing how to cache deps to make a slow pipeline fast, and not committing secrets to git.

## Why this matters in interviews

The probes are mechanical: "what runs when you open a PR?" (the workflow with `on: pull_request`; jobs in parallel; required checks block merge until green); "how do you keep your API key out of the repo?" (GitHub Secrets, referenced via `${{ secrets.NAME }}`, never hardcoded); "your CI takes 10 minutes; how do you speed it up?" (cache dependencies by lockfile hash); "test across Python 3.11 and 3.13" (`strategy: matrix`); "prevent main from breaking" (branch protection + required status checks). Senior candidates can read a 50-line `ci.yml` out loud and explain every line; junior candidates can write a 20-line one for a typical Python project. The vocabulary — workflow / jobs / steps / actions / runners / secrets / matrix — is the floor; using it fluently is the signal.

---

## Concept 1 — Pipeline-as-code structure: workflows, jobs, steps

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:                            # ← a job
    runs-on: ubuntu-latest         # fresh Ubuntu VM
    steps:                         # ← sequential within this job
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.13" }
      - run: pip install -r requirements.txt
      - run: pytest

  lint:                            # ← a separate job, runs in PARALLEL with `test`
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ruff check .
```

**Hierarchy:** `workflow` → `jobs` → `steps`.

- **Workflow** — the top-level YAML file in `.github/workflows/`. Defines `name`, `on` (triggers), and `jobs`.
- **Jobs** — parallel units of work. Each job runs on its own fresh runner VM (`ubuntu-latest`, `macos-latest`, `windows-latest`); no state is shared between jobs unless you explicitly upload/download artifacts.
- **Steps** — sequential commands within a job. Each step is either `uses:` (run a reusable action) or `run:` (execute shell commands directly).

**"Pipeline-as-code"** means the config lives in the repo (`.github/workflows/ci.yml`), versioned with the code, reviewed in PRs, and changes go through the same review process as any other code change. The alternative — pipelines configured through a UI (Jenkins UI, old Bamboo, classic Azure DevOps) — has no review history, no rollback, no diff. Pipeline-as-code won the last decade because it's the same kind of infrastructure your code already is.

`needs: test` on a job declares a dependency: that job won't start until `test` completes successfully. Without `needs`, jobs run in parallel.

---

## Concept 2 — GitHub Actions workflow syntax

```yaml
name: CI
on:
  push:
    branches: [main]               # only when pushed to main
  pull_request:                    # any PR
  workflow_dispatch:               # manual trigger via UI button

env:
  PYTHONUNBUFFERED: "1"            # workflow-level env var (every job sees it)

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      LOG_LEVEL: DEBUG             # job-level env (overrides workflow-level)
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.13"   # `with:` passes inputs to the action
      - name: Install
        run: pip install -e ".[dev]"
        env:
          PIP_PROGRESS_BAR: "off"  # step-level env (this step only)
      - run: pytest -q
```

- **`uses:` references a reusable action** — either from GitHub Marketplace (`actions/checkout@v4`) or another repo (`org/repo@ref`).
- **`run:` executes shell commands directly** — single line or multi-line via YAML `|`.
- **`with:` passes inputs to actions** (the action's `inputs:` definition determines what's accepted).
- **`env:` blocks scope to workflow / job / step level** — step-level overrides job-level overrides workflow-level.
- **Pin action versions** — `actions/checkout@v4` not `actions/checkout@main`. Using `@main` means a third party can push a malicious change and your CI runs it on next trigger. Pin to a specific tag or commit SHA; renovate-bot / dependabot can auto-bump pins.

---

## Concept 3 — Caching dependencies

```yaml
# Pattern 1: built-in cache parameter (preferred when available)
- uses: actions/setup-python@v5
  with:
    python-version: "3.13"
    cache: pip                                # caches pip's downloaded wheels
    cache-dependency-path: "requirements*.txt"

# Pattern 2: generic actions/cache (when you need control)
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-${{ runner.os }}-${{ hashFiles('requirements.txt') }}
    restore-keys: |
      pip-${{ runner.os }}-
```

Without caching, every CI run re-downloads and reinstalls every dependency from scratch — frequently the slowest part of a Python CI pipeline (1–3 minutes per job). With caching, second and subsequent runs restore the cache in seconds.

**The canonical pattern is "key based on lockfile hash":**

- `${{ hashFiles('requirements.txt') }}` computes a hash of the named file. Change the file, hash changes, cache key changes, fresh install. Don't change the file, hash matches, cache restored.
- `restore-keys:` is a fallback list — if the exact key isn't found, try keys with these prefixes (partial cache hit; restore something, then update on top).
- **Cache miss is silent** — the pipeline still works (just slower); you don't see an error. Watch CI duration over time to detect "we accidentally invalidated the cache for every run".

**What to cache:** pip wheels, `node_modules`, build artifacts, downloaded toolchains. **What NOT to cache:** anything that depends on machine state, anything where staleness causes incorrect behavior (compiled artifacts that should rebuild on source change).

---

## Concept 4 — Secrets management

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write                          # limit GITHUB_TOKEN scope explicitly
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./deploy.sh
        env:
          API_KEY: ${{ secrets.PROD_API_KEY }}      # from GitHub Secrets
          AWS_ROLE: ${{ secrets.AWS_DEPLOY_ROLE }}
```

**The non-negotiable rule: never commit secrets to a repo.** Once a secret is in git history, it's permanently leaked — even a force-push to remove it doesn't help (GitHub archives the dangling commits for some time, and anyone who cloned has the secret forever). Rotate any committed secret immediately, then never do it again.

**GitHub Secrets** — encrypted-at-rest values stored at repo, environment, or organization level. Available in workflows as `${{ secrets.SECRET_NAME }}`. The runner masks the value in logs (replaces with `***`), but the masking is best-effort: complex transformations (e.g., base64-decoding the secret then echoing) can leak it.

**`GITHUB_TOKEN`** is the built-in secret that authenticates the workflow's API calls to GitHub itself. Default permissions vary by org/repo settings (often too broad — read-write to contents, packages, etc.). The 2024+ best practice is to **explicitly declare minimum permissions** via the `permissions:` block, defaulting to `permissions: {}` (no access) and adding only what each job needs.

**OIDC federation** is the modern preferred shape for cloud credentials — instead of storing long-lived AWS / GCP / Azure tokens as GitHub Secrets, the runner exchanges a short-lived OIDC token from GitHub for short-lived cloud credentials. No long-lived secret to leak; tokens expire in minutes. Configurations: GitHub → cloud trust relationship + role assumption with `id-token: write` permission on the job.

---

## Concept 5 — Matrix builds

```yaml
jobs:
  test:
    strategy:
      fail-fast: false                # don't cancel sibling matrix jobs on first failure
      matrix:
        python-version: ["3.11", "3.12", "3.13"]
        os: [ubuntu-latest, macos-latest, windows-latest]
        exclude:
          - os: windows-latest
            python-version: "3.11"    # skip this one combination
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: ${{ matrix.python-version }} }
      - run: pytest
```

`strategy: matrix:` runs the same job multiple times with different parameter combinations. The example above generates `3 versions × 3 OSes − 1 exclusion = 8 parallel jobs`. Each parameter the matrix references (`${{ matrix.python-version }}`, `${{ matrix.os }}`) gets substituted per job.

**`fail-fast: true` (default) cancels sibling jobs the moment one fails** — good for fast feedback when you only care that *something* failed. **`fail-fast: false` lets every variant run to completion** — better when you want to see all failures at once (e.g., "Python 3.13 breaks, but does it break the same way on macOS as Ubuntu?").

**`include:` and `exclude:`** add/remove specific combinations from the matrix, useful for "test everything except this known-broken combination" or "additionally test this special case".

**When matrix is appropriate:** testing across language versions, OS combinations, dependency variants. **When it's not:** when the variants don't actually exercise different code paths (then it's just multiplying CI cost without information gain). Each variant is a separate billed minute on shared CI runners.

---

## Concept 6 — PR triggers, branch protection, required status checks

```yaml
on:
  pull_request:                      # PR open / sync / reopen
  push:
    branches: [main]                 # only direct pushes to main

jobs:
  test:
    runs-on: ubuntu-latest
    steps: [...]

  deploy:
    needs: test                      # only run after `test` succeeds
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps: [...]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true           # cancel old runs when a new commit pushes
```

**Branch protection rules** (configured in repo settings, not in YAML) enforce the "you can't merge to main if CI is red" policy:

- **Require status checks before merging** — list the CI jobs that must be green for a PR to be mergeable.
- **Require pull request reviews** — at least N approvals from code-owners or designated reviewers.
- **Prevent force-pushes to main** — protects history.
- **Require linear history** — disallows merge commits (forces rebase or squash).

**Status checks** are the GitHub-level integration of CI: each CI job reports `pending → success / failure`; the PR's "Checks" tab shows them; protected branches block merge until required ones are green.

**`if:` conditionals** skip steps or jobs based on context: `if: github.event_name == 'pull_request'` (only on PRs), `if: github.ref == 'refs/heads/main'` (only on main), `if: success() && needs.test.result == 'success'` (only if `test` succeeded). Common pattern: deploy job runs only on push-to-main, never on PRs.

**`concurrency:`** groups runs so newer ones cancel older ones — when a PR gets a new commit, the in-progress CI for the old commit cancels, saving runner-minutes. The `group` key determines what counts as "the same logical run".

---

## Quick check before you run cards

1. Job vs step — which run in parallel by default? Which share state with each other?
2. Your CI takes 5 minutes per run because `pip install` runs every time. What two YAML constructs (one specific action, one pattern) make subsequent runs much faster?
3. You hardcoded an API key in your workflow file two months ago. What's the recovery action, and why does removing the commit not solve the problem?
4. `actions/checkout@main` vs `actions/checkout@v4` — what's the security difference?
5. `strategy: matrix: python-version: ["3.11", "3.12", "3.13"]; os: [ubuntu-latest, macos-latest]` — how many parallel jobs?
6. What does branch protection give you that the workflow YAML can't?

If any feels shaky — re-read that section, then start the cards.
