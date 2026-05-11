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

import contextlib
import io
import shutil
import sys
import tempfile
import time
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path


def run_code_task(
    user_code: str, hidden_tests: str, allowlist: list,
) -> dict:
    """Run pytest against user_code + hidden_tests.

    Returns a dict matching the TS `RunResult` shape:
      ok, tests[], stdout, stderr, timed_out, total_duration_ms.

    `allowlist` is wired by T6.7's import-hook; T6.4 accepts and
    discards it so consumer call shapes are stable.
    """
    del allowlist  # T6.7 wires the import-hook

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
