"""T3.9 — count logic LOC per FastAPI handler under src/pyprep/api/routers/.

A "handler" is a function decorated with `@router.<method>(...)`. Logic LOC
excludes the signature, response_model decorator, docstring, blanks, and
comment-only lines. The Hard Rule 2 ceiling is ≤10 logic LOC per handler.

Usage: `uv run python scripts/audit_handlers.py [--max 10]`. Exit 0 if all
handlers fit; exit 1 with a per-handler breakdown if any overflow.
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

ROUTERS_DIR = Path(__file__).resolve().parents[1] / "src/pyprep/api/routers"
DEFAULT_MAX = 10

# Documented over-budget exceptions. Each entry must reference a NOTES.md
# section with the rationale. Adding a row here without a NOTES write-up is
# a lint failure waiting to happen — reviewer should reject.
ALLOWED_EXCEPTIONS: dict[tuple[str, str], str] = {
    ("mock.py", "generate"): "N020",
}


def is_handler(node: ast.AST) -> bool:
    if not isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
        return False
    for d in node.decorator_list:
        if (
            isinstance(d, ast.Call)
            and isinstance(d.func, ast.Attribute)
            and isinstance(d.func.value, ast.Name)
            and d.func.value.id == "router"
        ):
            return True
    return False


def logic_loc(fn: ast.FunctionDef | ast.AsyncFunctionDef, src_lines: list[str]) -> int:
    body = fn.body
    if (
        body
        and isinstance(body[0], ast.Expr)
        and isinstance(body[0].value, ast.Constant)
        and isinstance(body[0].value.value, str)
    ):
        body = body[1:]
    if not body:
        return 0
    start = body[0].lineno
    end = body[-1].end_lineno or body[-1].lineno
    n = 0
    for raw in src_lines[start - 1 : end]:
        s = raw.strip()
        if s and not s.startswith("#"):
            n += 1
    return n


def audit() -> tuple[int, list[tuple[str, str, int]]]:
    rows: list[tuple[str, str, int]] = []
    for path in sorted(ROUTERS_DIR.glob("*.py")):
        if path.name == "__init__.py":
            continue
        src = path.read_text("utf-8")
        tree = ast.parse(src)
        lines = src.splitlines()
        for node in ast.walk(tree):
            if is_handler(node):
                rows.append((path.name, node.name, logic_loc(node, lines)))
    return DEFAULT_MAX, rows


def main(argv: list[str] | None = None) -> int:
    args = argv or sys.argv[1:]
    max_loc = DEFAULT_MAX
    if "--max" in args:
        i = args.index("--max")
        max_loc = int(args[i + 1])
    _, rows = audit()
    width = max(len(f"{f}::{n}") for f, n, _ in rows)
    fails: list[tuple[str, str, int]] = []
    stale: list[tuple[str, str, int]] = []
    sys.stdout.write(f"{'handler':<{width}}  loc\n")
    for f, n, loc in rows:
        ref = ALLOWED_EXCEPTIONS.get((f, n))
        if loc > max_loc and ref is None:
            marker = "  <-- OVER (no waiver)"
            fails.append((f, n, loc))
        elif loc > max_loc:
            marker = f"  <-- ALLOWED ({ref})"
        elif loc <= max_loc and ref is not None:
            marker = f"  <-- STALE WAIVER (within budget now; retire {ref})"
            stale.append((f, n, loc))
        else:
            marker = ""
        sys.stdout.write(f"{f}::{n:<{width - len(f) - 2}}  {loc}{marker}\n")
    if fails:
        sys.stdout.write(
            f"\nFAIL: {len(fails)} handler(s) over {max_loc} LOC without a NOTES waiver\n"
        )
        return 1
    if stale:
        sys.stdout.write(f"\nFAIL: {len(stale)} stale waiver(s) — clean up\n")
        return 1
    sys.stdout.write(f"\nOK: all {len(rows)} handlers within budget (waivers honored)\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
