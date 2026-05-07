"""T0.5 — package import + version smoke test."""

from __future__ import annotations

import re

from pyprep import __version__


def test_version_string() -> None:
    assert isinstance(__version__, str)
    assert re.fullmatch(r"\d+\.\d+", __version__), __version__
