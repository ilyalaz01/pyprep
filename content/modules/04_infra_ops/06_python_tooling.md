---
module_id: 4
sphere_id: "m4-s6"
title: "Python Tooling"
title_ru: "Python тулинг"
estimated_minutes: 13
prerequisites: ["m2-s0"]
tags: ["python", "tooling", "uv", "ruff", "mypy", "pyproject", "venv", "big-o"]
---

# Python Tooling

Modern Python projects in 2026 look very different from those of 2020. The interview signal isn't "do you know `pip install`?" — that's a given. It's whether you recognize the *current* stack: `uv` instead of `pip`, `pyproject.toml` instead of `setup.py`, `ruff` instead of `flake8`+`isort`+parts of `pylint`, and `mypy` (or `pyright`) as a CI gate that catches type bugs before runtime. Naming the legacy AND the modern tools is the competence signal — it shows you've kept up with the ecosystem, not just learned it once five years ago.

## Why this matters in interviews

The probes are screening-shape: "how do you isolate dependencies per project?" (venv, ideally `uv venv`); "what's a `pyproject.toml` for?" (modern project metadata + dep declarations); "difference between `requirements.txt` and a lockfile?" (flat pinned list vs deterministic transitive resolution); "what does `ruff` replace?" (`flake8`, `isort`, and a chunk of `pylint`); "why use `mypy` in a dynamically-typed language?" (static type errors caught before runtime, IDE support, intent documentation). The Big-O lite portion is the floor: every interview at every level asks "why is dict lookup faster than list scan" or some variant. Hash-O(1)-vs-linear-O(n) is the answer, and you should be able to give it without thinking.

---

## Concept 1 — Virtual environments: `python -m venv`, `uv venv`

```bash
python -m venv .venv                  # stdlib creator — slow, ~3s on a typical machine
source .venv/bin/activate             # Linux/Mac
.venv\Scripts\activate                # Windows
deactivate                            # exit

uv venv                               # modern: same result, ~0.1s
source .venv/bin/activate             # activation works the same way regardless of creator
```

A virtual environment is a **directory containing a Python interpreter, a `pip`, and an isolated `site-packages/`**. Activation modifies your shell's `PATH` so that typing `python` finds the venv's Python first, not the system one. The isolation matters because Python's import system is global to a single interpreter — without venvs, every project's dependencies live in the same `site-packages` and version conflicts are inevitable ("project A needs `requests==2.20`, project B needs `requests==2.31`, system pip can hold one at a time").

**`uv venv` vs `python -m venv`** — same output, dramatically different speed (~30x). `uv` is a Rust-based replacement for the entire pip/venv toolchain; its venv creator is the start of the modernization story this sphere walks through. Pick `uv venv` for new projects; `python -m venv` is still fine and is the lowest-common-denominator option that works without installing anything.

**Always add `.venv/` to `.gitignore`.** Committing a venv ships compiled binaries that don't relocate between machines and bloats the repository. Dependencies are reconstructed from `pyproject.toml` / `uv.lock` (see Concept 2); the venv is build artifact, not source.

---

## Concept 2 — `pip` vs `uv` vs `poetry`; `pyproject.toml` and lockfiles

```toml
# pyproject.toml — modern project metadata
[project]
name = "myapp"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = [
    "fastapi>=0.110",
    "sqlalchemy>=2.0",
]

[dependency-groups]
dev = [
    "pytest>=8.0",
    "ruff>=0.4",
    "mypy>=1.10",
]
```

```bash
pip install -r requirements.txt       # legacy: flat list, no lockfile
uv add fastapi                        # modern: adds to pyproject + installs + updates lockfile
uv sync                               # install everything from uv.lock (reproducible)
poetry install                        # same shape, older tool, still common in established projects
```

**The tooling evolution:**

- **`pip`** is the stdlib installer. Reliable, ubiquitous, slow, no built-in lockfile. Used with `requirements.txt` — a flat list of pinned versions.
- **`poetry`** introduced `pyproject.toml`-based dependency management with lockfiles to Python. Comprehensive but historically slow; mostly still seen in projects started 2020–2024.
- **`uv`** is the 2025+ standard. Rust-based; 10–100x faster than pip; supersets poetry's functionality with `pyproject.toml` + `uv.lock` + automatic venv management. The most-frequent direction migration tickets point in.

**`pyproject.toml` vs `requirements.txt` vs lockfile** — three different roles:

- **`pyproject.toml`** declares your *intended* dependencies, often with loose constraints (`>=2.0`). This is what humans edit.
- **`requirements.txt`** is the legacy flat list of pinned versions, typically generated as the *output* of a resolver. It doesn't represent transitive deps' relationships, just their final pinned versions.
- **`uv.lock` / `poetry.lock`** captures the *resolved transitive dependency graph* — every package, every version, hashes for verification, and the relationships between them. Re-running `uv sync` from the same lockfile produces an identical environment, even months later, even if newer versions of packages have been released.

The interview probe "difference between `requirements.txt` and a lockfile?" — `requirements.txt` is a pin list (snapshot of versions, no relationships); a lockfile is a deterministic recipe for reconstructing the exact resolved graph.

---

## Concept 3 — `ruff`, `black`, `mypy` — what each does

```bash
ruff check .                          # lint: style + bugs + imports
ruff format .                         # format: opinionated style (alternative to black)
black .                               # formatter — black's job; ruff format does the same
mypy src/                             # static type checker — flags type errors before runtime
```

```toml
# pyproject.toml — typical configuration
[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "S"]   # error codes to enforce
ignore = ["E501"]                          # line-too-long handled by formatter

[tool.mypy]
strict = true                              # opt-in to all strict checks
python_version = "3.13"
```

- **`black`** — opinionated, zero-config formatter. The original "stop bikeshedding about style" tool. Still widely used.
- **`ruff`** — Rust-based linter + formatter from the Astral team (same group that ships `uv`). Replaces `flake8` (linting), `isort` (import sorting), parts of `pylint`, parts of `pyupgrade`. The format mode (`ruff format`) is a `black`-compatible reimplementation; many teams now drop `black` entirely once they adopt `ruff`.
- **`mypy`** — static type checker that uses Python type hints (`def f(x: int) -> str:`) to find type bugs before the code runs. Modern teams enable strict mode (`--strict` / `strict = true` in config) on new code; legacy codebases run mypy gradually module by module.

**The standard CI gate** in modern Python projects: `ruff check` + `ruff format --check` + `mypy --strict` + `pytest`. Each catches a distinct class of bug (style/correctness, formatting drift, type errors, behavioral regressions); each runs in seconds. Pre-commit hooks (via the `pre-commit` framework) run the same checks locally so issues are caught before they reach CI.

**"Why mypy if Python is dynamically typed?"** — three reasons. (1) Type errors caught at write-time, not runtime — most `AttributeError: 'NoneType' object has no attribute 'x'` bugs are predictable from types and don't need to wait for a request to hit production. (2) IDE autocomplete and refactoring rely on types — renaming a function with no type hints requires grep; renaming a typed function lets the IDE find every call site mechanically. (3) Types document intent — `def get_user(user_id: int) -> User | None` tells the reader the contract; a typeless `def get_user(user_id)` does not.

---

## Concept 4 — Big-O thinking lite + collection complexities

```
O(1)         constant       dict[key], set membership, list[i], list.append
O(log n)     logarithmic    binary search, balanced tree ops
O(n)         linear         list scan, `item in list`, sum/len of unsorted seq
O(n log n)   quasi-linear   sorted() / list.sort() (Timsort)
O(n²)        quadratic      nested loop over same data, naive deduplication
```

**Python collection complexities you should know cold:**

```python
# list
d[i]            # O(1)
d.append(x)     # O(1) amortized
d.insert(0, x)  # O(n)  — shifts every element!
x in d          # O(n)  — linear scan
d.pop()         # O(1)  — from the end
d.pop(0)        # O(n)  — shifts every element

# dict
d[key]          # O(1)  — hash lookup
key in d        # O(1)
d[key] = v      # O(1)

# set
x in s          # O(1)
s.add(x)        # O(1)

# collections.deque — for when you need O(1) on BOTH ends
from collections import deque
q = deque()
q.appendleft(x) # O(1)
q.append(x)     # O(1)
q.popleft()     # O(1)
```

**The marquee interview optimization:** "this loop scans a list to check membership repeatedly" → "precompute a set" turns O(n*m) into O(n+m).

```python
# Slow: O(len(haystack) * len(needles))
bad = [x for x in needles if x in haystack]

# Fast: O(len(haystack) + len(needles))
haystack_set = set(haystack)
good = [x for x in needles if x in haystack_set]
```

The space-vs-time tradeoff is explicit: you spend O(n) memory to build the set so that each lookup is O(1) instead of O(n). For one or two lookups, it's not worth the conversion cost; for many lookups against the same haystack, it's the canonical optimization. Variants of this question ("count common elements", "find duplicates", "deduplicate while preserving order") appear in roughly every junior technical screen.

---

## Quick check before you run cards

1. Why does activating a venv modify your shell, and what does it actually change?
2. You have a `pyproject.toml` listing `fastapi>=0.110`. What additional file gives you a *reproducible* install months later, and what does it contain that `pyproject.toml` doesn't?
3. Name three tools `ruff` replaces.
4. "Why mypy in a dynamic language?" — give three reasons.
5. `list.insert(0, x)` is O(n); what's the right data structure if you need O(1) prepends repeatedly?
6. Walk through the "precompute a set" optimization. When is it worth doing? When isn't it?

If any feels shaky — re-read that section, then start the cards.
