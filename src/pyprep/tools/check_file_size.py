"""Enforce the 150-LOC-per-file ceiling on `src/` and `frontend/src/`.

Blanks and lines whose stripped form is a single-line comment (`#` for
Python, `//` for TS/JS) are excluded from the count. Block comments are
not stripped — over-counting in rare cases is preferred to under-counting.
"""

from __future__ import annotations

import sys
from collections.abc import Iterable, Sequence
from pathlib import Path

MAX_LOC: int = 150
ROOTS: tuple[str, ...] = ("src", "frontend/src")
SUFFIXES: tuple[str, ...] = (".py", ".ts", ".tsx", ".js", ".jsx")
_PY_PREFIXES = ("#",)
_TS_PREFIXES = ("//",)


def count_loc(path: Path) -> int:
    text = path.read_text(encoding="utf-8", errors="replace")
    prefixes = _PY_PREFIXES if path.suffix == ".py" else _TS_PREFIXES
    n = 0
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if any(stripped.startswith(p) for p in prefixes):
            continue
        n += 1
    return n


def iter_source_files(root: Path) -> Iterable[Path]:
    for r in ROOTS:
        base = root / r
        if not base.exists():
            continue
        for p in base.rglob("*"):
            if p.is_file() and p.suffix in SUFFIXES:
                yield p


def find_violations(root: Path, max_loc: int = MAX_LOC) -> list[tuple[Path, int]]:
    return [(p, n) for p in iter_source_files(root) if (n := count_loc(p)) > max_loc]


def main(argv: Sequence[str] | None = None) -> int:
    del argv  # no flags yet
    root = Path.cwd()
    violations = find_violations(root, MAX_LOC)
    if violations:
        sys.stderr.write(f"FAIL: {len(violations)} file(s) exceed {MAX_LOC} LOC\n")
        for path, n in violations:
            sys.stderr.write(f"  {path.relative_to(root)} — {n} LOC\n")
        return 1
    sys.stdout.write(f"OK: 0 files exceed {MAX_LOC} LOC\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
