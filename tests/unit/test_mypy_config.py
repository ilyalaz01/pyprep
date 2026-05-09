"""T3.5.1 — pin the mypy strict gate's `files` list.

CI runs `uv run mypy` (no args), which uses `[tool.mypy].files` from
pyproject.toml. If a future PR removes `src/pyprep/api` from that list,
api/ would silently stop being type-checked — the failure mode that let
the original errors.py:_handler_for missing-annotation bug ship to main.
This test catches that drift before CI does.
"""

from __future__ import annotations

import sys
import tomllib
from pathlib import Path

PYPROJECT = Path(__file__).resolve().parents[2] / "pyproject.toml"


def _files() -> list[str]:
    cfg = tomllib.loads(PYPROJECT.read_text("utf-8"))
    return cfg["tool"]["mypy"]["files"]


def test_mypy_strict_covers_sdk() -> None:
    assert "src/pyprep/sdk" in _files()


def test_mypy_strict_covers_api() -> None:
    """T3.5.1 — api/ must be type-checked alongside sdk/."""
    assert "src/pyprep/api" in _files()


def test_mypy_strict_mode_enabled() -> None:
    cfg = tomllib.loads(PYPROJECT.read_text("utf-8"))
    assert cfg["tool"]["mypy"]["strict"] is True


def test_python_311_for_tomllib() -> None:
    """tomllib is stdlib in 3.11+."""
    assert sys.version_info >= (3, 11)
