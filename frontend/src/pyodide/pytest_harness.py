"""Pytest harness for Pyodide-hosted code execution (T6.4).

Writes user_code + hidden_tests to a tmp dir, runs pytest, captures
per-test outcomes into a JSON-serializable dict matching the TS
RunResult shape in `./types.ts`.

The harness lives as a raw string asset that the worker imports via
Vite's `?raw` query (`import harness from './pytest_harness.py?raw'`);
worker.ts calls `pyodide.runPython(harness)` after
`loadPackage('pytest')` (T6.3 → T6.4) to install `run_code_task` in
the Pyodide globals. T6.5 wires the JS-side call from runner.ts.

Per ADR-021: hand-rolled JSON adapter via pytest_runtest_logreport
hook — `pytest-json-report` is not bundled in Pyodide 0.26.4 and
loading it via `micropip` would inflate cold-start.

The module uses only portable stdlib so backend pytest can exercise
the orchestration under CPython (tests/unit/test_pytest_harness.py).
T6.10 covers the real-Pyodide integration path.
"""

from __future__ import annotations

import builtins
import contextlib
import io
import shutil
import sys
import tempfile
import time
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

# Allowlist import-hook (T6.7 / ADR-019). The hook is installed once
# per worker lifetime — the baseline `sys.modules` snapshot at that
# moment captures whatever pytest pulled in to start up, plus this
# harness itself; per-run user code can additionally import from the
# task's `allowlist`. `solution` / `test_solution` are always allowed
# (the tmpdir module names the harness writes).
_REAL_IMPORT = builtins.__import__
_BASELINE_TOP: set[str] = set()
_ALLOWED_TOP: set[str] = set()
_HOOK_INSTALLED = False
_ALWAYS_ALLOWED = frozenset({"solution", "test_solution"})


def _gated_import(name, globals_=None, locals_=None, fromlist=(), level=0):
    if level != 0:
        return _REAL_IMPORT(name, globals_, locals_, fromlist, level)
    top = name.split(".")[0]
    if top in _BASELINE_TOP or top in _ALLOWED_TOP or top in _ALWAYS_ALLOWED:
        return _REAL_IMPORT(name, globals_, locals_, fromlist, level)
    user_list = ", ".join(sorted(_ALLOWED_TOP)) or "(none)"
    raise ImportError(
        f"'{name}' is not allowed in this code task. "
        f"Allowed modules: {user_list}",
    )


def _install_import_hook() -> None:
    global _HOOK_INSTALLED, _BASELINE_TOP
    if _HOOK_INSTALLED:
        return
    # Pre-import pytest so its transitive deps land in baseline before
    # the snapshot. Without this, the first run_code_task call would
    # widen baseline mid-pytest and confuse the gate.
    import pytest
    del pytest
    _BASELINE_TOP = {m.split(".")[0] for m in sys.modules}
    builtins.__import__ = _gated_import
    _HOOK_INSTALLED = True


def run_code_task(
    user_code: str, hidden_tests: str, allowlist: list,
) -> dict:
    """Run pytest against user_code + hidden_tests.

    Returns a dict matching the TS `RunResult` shape:
      ok, tests[], stdout, stderr, timed_out, total_duration_ms.

    `allowlist` gates user imports via the install-once
    `_install_import_hook` (T6.7 / ADR-019).
    """
    global _ALLOWED_TOP
    _install_import_hook()
    _ALLOWED_TOP = set(allowlist)

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
        _ALLOWED_TOP = set()  # reset per-task gate

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
