"""Pytest harness for Pyodide-hosted code execution (T6.4 / T6.7).

Writes user_code + hidden_tests to a tmp dir, runs pytest, captures
per-test outcomes into a JSON-serializable dict matching the TS
RunResult shape in `./types.ts`.

The harness lives as a raw string asset that the worker imports via
Vite's `?raw` query (`import harness from './pytest_harness.py?raw'`);
worker.ts calls `pyodide.runPython(harness)` after
`loadPackage('pytest')` (T6.3 → T6.4). T6.5 wires the JS-side call
from runner.ts via `pyodide.globals.get('run_code_task')`.

Per ADR-021: hand-rolled JSON adapter via pytest_runtest_logreport
hook — `pytest-json-report` is not bundled in Pyodide 0.26.4.

The module uses only portable stdlib so backend pytest can exercise
the orchestration under CPython (tests/unit/test_pytest_harness.py).
T6.10 covers the real-Pyodide integration path.
"""

from __future__ import annotations

import ast
import contextlib
import io
import shutil
import sys
import tempfile
import time
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

# T6.7 / ADR-019 (amended): allowlist enforcement is a static AST
# extraction of imports from user_code + hidden_tests. We discover
# every top-level package the user explicitly references and check
# against the per-task allowlist BEFORE running pytest. A runtime
# `builtins.__import__` hook was the first cut at stop #3 but failed
# fatally — Python's internal bootstrap puts user-code frames in the
# stack during module load, and pytest lazy-loads plugins like
# junitxml that import xml.etree mid-run. Static AST avoids the
# whole class of false positive: pytest internals, stdlib bootstrap,
# and the harness itself are never subject to the gate.
#
# `solution` / `test_solution` are always allowed (the tmpdir module
# names the harness writes). Dynamic imports (importlib.import_module
# from a string-typed name) are not statically detectable and will
# pass — see ADR-019 "revisit when".
_ALWAYS_ALLOWED = frozenset({"solution", "test_solution"})


def _extract_top_imports(code: str) -> set[str]:
    """Return the set of top-level package names imported by `code`."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return set()
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                names.add(alias.name.split(".")[0])
        elif (
            isinstance(node, ast.ImportFrom)
            and node.level == 0
            and node.module
        ):
            names.add(node.module.split(".")[0])
    return names


def _check_allowlist(
    user_code: str, hidden_tests: str, allowlist: list,
) -> str | None:
    """Return a clean ImportError-style message if user code imports
    something outside the allowlist; otherwise return None."""
    requested = (
        _extract_top_imports(user_code) | _extract_top_imports(hidden_tests)
    )
    allowed = set(allowlist) | _ALWAYS_ALLOWED
    forbidden = sorted(requested - allowed)
    if not forbidden:
        return None
    user_list = ", ".join(sorted(allowlist)) or "(none)"
    return (
        f"ImportError: '{forbidden[0]}' is not allowed in this code task. "
        f"Allowed modules: {user_list}"
    )


def run_code_task(
    user_code: str, hidden_tests: str, allowlist: list,
) -> dict:
    """Run pytest against user_code + hidden_tests.

    Returns a dict matching the TS `RunResult` shape:
      ok, tests[], stdout, stderr, timed_out, total_duration_ms.
    """
    error = _check_allowlist(user_code, hidden_tests, allowlist)
    if error is not None:
        return {
            "ok": False, "tests": [], "stdout": "", "stderr": error,
            "timed_out": False, "total_duration_ms": 0,
        }

    tmp = Path(tempfile.mkdtemp(prefix="pyprep_"))
    (tmp / "solution.py").write_text(user_code)
    (tmp / "test_solution.py").write_text(hidden_tests)
    sys.path.insert(0, str(tmp))
    # FR-SBX-6: fresh `solution` per call. Drop any cached module so
    # the test file's `from solution import ...` always re-imports.
    sys.modules.pop("solution", None)
    sys.modules.pop("test_solution", None)

    results: list = []

    class _Collector:
        def pytest_runtest_logreport(self, report) -> None:
            if report.when != "call":
                return
            results.append({
                "name": report.nodeid.split("::")[-1],
                "passed": bool(report.passed),
                "message": report.longreprtext if report.failed else None,
                "traceback": report.longreprtext if report.failed else None,
                "duration_ms": int(report.duration * 1000),
            })

    stdout_buf, stderr_buf = io.StringIO(), io.StringIO()
    t0 = time.monotonic()
    try:
        import pytest
        with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
            pytest.main(
                ["-q", "--no-header", "-p", "no:cacheprovider",
                 str(tmp / "test_solution.py")],
                plugins=[_Collector()],
            )
    finally:
        with contextlib.suppress(ValueError):
            sys.path.remove(str(tmp))
        shutil.rmtree(tmp, ignore_errors=True)

    total_ms = int((time.monotonic() - t0) * 1000)
    ok = len(results) > 0 and all(r["passed"] for r in results)

    return {
        "ok": ok,
        "tests": results,
        "stdout": stdout_buf.getvalue(),
        "stderr": stderr_buf.getvalue(),
        "timed_out": False,
        "total_duration_ms": total_ms,
    }
