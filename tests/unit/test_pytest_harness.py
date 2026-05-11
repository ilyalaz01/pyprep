"""T6.4 — pytest harness module for Pyodide code-task execution.

The harness lives at `frontend/src/pyodide/pytest_harness.py` and
runs inside the Pyodide WASM runtime (installed via
`pyodide.runPython(source)` after `loadPackage('pytest')`). It uses
portable stdlib only (tempfile, pathlib, pytest) so backend pytest
can load it as a regular module and exercise the orchestration
under CPython. Integration coverage against real Pyodide is T6.10.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType


def _load_harness() -> ModuleType:
    repo_root = Path(__file__).resolve().parents[2]
    path = repo_root / "frontend" / "src" / "pyodide" / "pytest_harness.py"
    spec = importlib.util.spec_from_file_location("pytest_harness", path)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_run_code_task_ok_when_all_tests_pass() -> None:
    h = _load_harness()
    r = h.run_code_task(
        user_code="def add(a, b):\n    return a + b\n",
        hidden_tests=(
            "from solution import add\n"
            "def test_add_two(): assert add(1, 2) == 3\n"
            "def test_add_negatives(): assert add(-1, -2) == -3\n"
        ),
        allowlist=[],
    )
    assert r["ok"] is True
    assert len(r["tests"]) == 2
    assert all(t["passed"] for t in r["tests"])
    assert r["timed_out"] is False
    assert r["total_duration_ms"] >= 0


def test_run_code_task_reports_failure_with_message_and_name() -> None:
    h = _load_harness()
    r = h.run_code_task(
        user_code="def add(a, b):\n    return a - b\n",
        hidden_tests=(
            "from solution import add\n"
            "def test_add_two(): assert add(1, 2) == 3\n"
        ),
        allowlist=[],
    )
    assert r["ok"] is False
    assert len(r["tests"]) == 1
    t = r["tests"][0]
    assert t["passed"] is False
    assert "test_add_two" in t["name"]
    assert t["message"]  # non-empty failure message


def test_run_code_task_zero_tests_collected_is_not_ok() -> None:
    h = _load_harness()
    r = h.run_code_task(
        user_code="def add(a, b): return a + b\n",
        hidden_tests="# no tests here\n",
        allowlist=[],
    )
    assert r["ok"] is False  # vacuous-true rejected
    assert r["tests"] == []


def test_run_code_task_returns_runresult_shape() -> None:
    """Keys must match frontend/src/pyodide/types.ts RunResult."""
    h = _load_harness()
    r = h.run_code_task(
        user_code="def f(): return 1\n",
        hidden_tests="from solution import f\ndef test(): assert f() == 1\n",
        allowlist=[],
    )
    for key in ("ok", "tests", "stdout", "stderr", "timed_out",
                "total_duration_ms"):
        assert key in r
    for t in r["tests"]:
        for key in ("name", "passed", "duration_ms"):
            assert key in t


def test_real_solution_code_passes_with_representative_allowlist() -> None:
    """Stop-#3 happy-path regression. Pre-fix the hook intercepted
    pytest's internal `xml.etree.ElementTree` import (junitxml plugin)
    and rejected it as a non-allowlisted module — blocking every
    code_task. Post-fix the hook uses stack-frame inspection to only
    enforce allowlist on imports originating from user code; pytest
    internals + stdlib pass through unconditionally."""
    h = _load_harness()
    r = h.run_code_task(
        user_code="def add(a, b):\n    return a + b\n",
        hidden_tests=(
            "from solution import add\n"
            "def test_add(): assert add(2, 3) == 5\n"
        ),
        allowlist=["pytest"],  # representative card allowlist
    )
    assert r["ok"] is True, (
        f"happy path must succeed; "
        f"got stdout={r['stdout']!r} stderr={r['stderr']!r}"
    )
    assert len(r["tests"]) == 1
    assert r["tests"][0]["passed"] is True


def test_run_code_task_rejects_disallowed_import() -> None:
    """T6.7 / ADR-019: static AST extraction flags imports outside
    the allowlist with the documented error format. `smtplib` is the
    test target — `socket` is the PRD canonical example but the AST
    treats them identically; either would fail the gate."""
    h = _load_harness()
    r = h.run_code_task(
        user_code="import smtplib\ndef f(): return 1\n",
        hidden_tests="from solution import f\ndef test(): assert f() == 1\n",
        allowlist=["math"],
    )
    assert r["ok"] is False
    combined = (r["stdout"] + r["stderr"]).lower()
    assert "smtplib" in combined and "not allowed" in combined
    assert "allowed modules: math" in combined


def test_run_code_task_allowlist_entry_imports_cleanly() -> None:
    h = _load_harness()
    r = h.run_code_task(
        user_code="import math\ndef double_pi(): return 2 * math.pi\n",
        hidden_tests=(
            "from solution import double_pi\n"
            "def test(): assert double_pi() > 6.28\n"
        ),
        allowlist=["math"],
    )
    assert r["ok"] is True


def test_run_code_task_does_not_leak_solution_between_calls() -> None:
    """Per FR-SBX-6 / ADR-016 mental model: each call gets a fresh
    `solution` module — a previous call's globals must not leak."""
    h = _load_harness()
    r1 = h.run_code_task(
        user_code="def f(): return 'first'\n",
        hidden_tests=(
            "from solution import f\n"
            "def test(): assert f() == 'first'\n"
        ),
        allowlist=[],
    )
    r2 = h.run_code_task(
        user_code="def f(): return 'second'\n",
        hidden_tests=(
            "from solution import f\n"
            "def test(): assert f() == 'second'\n"
        ),
        allowlist=[],
    )
    assert r1["ok"] is True
    assert r2["ok"] is True
