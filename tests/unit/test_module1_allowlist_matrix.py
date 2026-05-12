"""T6.12 — Module 1 allowlist smoke matrix (parameterized).

Per Phase 6 brief: for each `code_task` card in Module 1, verify both
sides of the static-AST allowlist gate (ADR-019 amended):

1. **Allowed-import smoke.** Synthesize a tiny code + test pair that
   `import`s every module in the card's `allowlist`, then asserts a
   trivial truth. Run through `pytest_harness.run_code_task` with the
   real allowlist. Expect `ok=True` — no false rejection of declared
   modules, all of them statically detected by the AST walker.

2. **Denied-import smoke.** Same card's allowlist, but the user code
   tries to `import socket` (not in any Module 1 allowlist). Expect
   `ok=False` and the documented clean `ImportError:` message format
   from `pytest_harness._check_allowlist`. Verifies the gate fires
   per-card, not just once globally — important because the allowlist
   is per-task state, not a worker-wide constant.

This complements T6.10's smoke matrix (which proves authored
solutions pass their own tests). T6.10 covers the success path of
content; T6.12 covers the gate boundaries, parameterized over the
same card set.

CPython-side only — same Pyodide-actual coverage gap as T6.10 (N037).
The static-AST gate is portable so divergence risk is low.
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


_CARDS = _module1_code_tasks()
_IDS = [str(c.get("id", "?")) for c in _CARDS]

# Denied module: not present in ANY Module 1 allowlist. Picked because
# it's an obvious security-relevant stdlib member; if a future card
# legitimately allowlists `socket`, swap to something still denied
# everywhere (e.g. `ctypes`).
_DENIED_MODULE = "socket"


def _make_allow_smoke_code(allowlist: list[str]) -> tuple[str, str]:
    """Build a (user_code, hidden_tests) pair that imports every
    module in the allowlist, then defines a trivial pass-test."""
    imports = "\n".join(f"import {mod}" for mod in allowlist)
    user_code = f"{imports}\n\ndef ok():\n    return True\n"
    hidden_tests = (
        "from solution import ok\n\n"
        "def test_ok():\n    assert ok() is True\n"
    )
    return user_code, hidden_tests


def _make_deny_smoke_code() -> tuple[str, str]:
    user_code = f"import {_DENIED_MODULE}\n\ndef noop():\n    return None\n"
    hidden_tests = (
        "from solution import noop\n\n"
        "def test_noop():\n    assert noop() is None\n"
    )
    return user_code, hidden_tests


@pytest.mark.parametrize("card", _CARDS, ids=_IDS)
def test_every_allowlisted_module_passes_the_gate(
    card: dict[str, Any],
) -> None:
    """Each card's full allowlist must import cleanly through the
    static-AST gate. False rejection of a declared module = content
    bug (mis-spelled allowlist entry) or harness regression."""
    allowlist = list(card.get("allowlist", []))
    if not allowlist:
        pytest.skip(f'{card["id"]}: empty allowlist, nothing to smoke')

    h = _load_harness()
    user_code, hidden_tests = _make_allow_smoke_code(allowlist)
    result = h.run_code_task(
        user_code=user_code,
        hidden_tests=hidden_tests,
        allowlist=allowlist,
    )
    assert result["ok"] is True, (
        f'{card["id"]}: allowlist={allowlist} should pass the gate but\n'
        f'tests={result["tests"]}\nstderr={result["stderr"]!r}'
    )


@pytest.mark.parametrize("card", _CARDS, ids=_IDS)
def test_denied_module_raises_clean_importerror(
    card: dict[str, Any],
) -> None:
    """Per-card: importing `socket` (denied) must trip the gate and
    return the documented `ImportError: '<mod>' is not allowed ...`
    message — not a raw Python traceback, not silent fall-through to
    pytest collection error."""
    allowlist = list(card.get("allowlist", []))
    assert _DENIED_MODULE not in allowlist, (
        f'{card["id"]}: test assumption broken — `{_DENIED_MODULE}` '
        f"is in this card's allowlist; pick a different denied module"
    )

    h = _load_harness()
    user_code, hidden_tests = _make_deny_smoke_code()
    result = h.run_code_task(
        user_code=user_code,
        hidden_tests=hidden_tests,
        allowlist=allowlist,
    )
    assert result["ok"] is False
    assert result["timed_out"] is False
    assert result["tests"] == []
    assert (
        f"ImportError: '{_DENIED_MODULE}' is not allowed in this code task"
        in result["stderr"]
    )
    # Message lists what IS allowed so the user can pivot. Sanity-check
    # one of the card's declared modules surfaces in the message body.
    if allowlist:
        assert allowlist[0] in result["stderr"]


def test_matrix_covers_full_module1_code_task_set() -> None:
    """Sanity check the parametrize source matches the Phase 6 floor.
    T6.10 already pins ≥5; this duplicates the guard so a regression
    in one suite doesn't quietly skip the other."""
    assert len(_CARDS) >= 5, (
        f"expected ≥ 5 code_task cards in Module 1, got {len(_CARDS)}"
    )
