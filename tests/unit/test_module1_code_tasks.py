"""T6.10 — Module 1 code_task smoke matrix.

Iterates every `code_task` card in `content/modules/01_*/` and asserts
that the card's documented `solution_code` passes its hidden `tests`
when fed through `pytest_harness.run_code_task`.

This is the test that catches content/harness drift: card author
breaks the solution, the harness regresses, the allowlist field is
mis-spelled, or a test imports something the allowlist forgot.

**Important coverage gap (filed as N037 if not already):** this test
runs under CPython, not Pyodide. The stop-#3 regression (T6.7 hook
rejecting pytest-internal `xml.etree.ElementTree`) was a CPython-
vs-Pyodide baseline divergence that a CPython-only test cannot
catch. The ADR-019 amendment (static AST extraction) makes that
specific bug class structurally impossible — but other Pyodide-only
bugs (pytest version drift between Pyodide's bundle and the host's
pip, emscripten fs quirks, etc.) remain uncovered here. Owner's
manual stop-#4 verification + Phase-10 Playwright e2e close that
gap.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_harness() -> ModuleType:
    path = (
        _repo_root() / "frontend" / "src" / "pyodide" / "pytest_harness.py"
    )
    spec = importlib.util.spec_from_file_location("pytest_harness", path)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _module1_code_tasks() -> list[dict[str, Any]]:
    root = _repo_root() / "content" / "modules"
    out: list[dict[str, Any]] = []
    for cards_file in sorted(root.glob("01_*/*.cards.json")):
        data = json.loads(cards_file.read_text())
        for card in data.get("cards", []):
            if isinstance(card, dict) and card.get("type") == "code_task":
                out.append(card)
    return out


def _idfn(card: dict[str, Any]) -> str:
    return str(card.get("id", "?"))


# Discover once at import time so pytest can show the card id in
# the test name (parametrize id), not just an integer index.
_CARDS = _module1_code_tasks()


@pytest.mark.parametrize("card", _CARDS, ids=[_idfn(c) for c in _CARDS])
def test_module1_code_task_solution_passes_its_own_tests(
    card: dict[str, Any],
) -> None:
    """Each card's `solution_code` must pass its hidden `tests` under
    the harness with the card's documented `allowlist`."""
    h = _load_harness()
    result = h.run_code_task(
        user_code=card["solution_code"],
        hidden_tests=card["tests"],
        allowlist=card.get("allowlist", []),
    )
    assert result["ok"] is True, (
        f'{card["id"]}: expected ok=True but got\n'
        f'tests={result["tests"]}\n'
        f'stdout={result["stdout"]!r}\n'
        f'stderr={result["stderr"]!r}'
    )
    assert len(result["tests"]) > 0, (
        f'{card["id"]}: tests block defined no tests'
    )


def test_module1_has_code_task_coverage() -> None:
    """Phase 6 exit gate sanity: at least 5 code_tasks exist so the
    parametrized suite above is exercising real content. If Module 1
    content is restructured below this floor, this assertion needs
    revisiting alongside the content change."""
    assert len(_CARDS) >= 5, (
        f"expected ≥ 5 code_task cards in Module 1, got {len(_CARDS)}"
    )
