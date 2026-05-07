"""T0.4 — `python -m pyprep` prints the version."""

from __future__ import annotations

import subprocess
import sys

import pytest

from pyprep import __version__
from pyprep.main import main


def test_main_writes_version_to_stdout(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main()
    captured = capsys.readouterr()
    assert __version__ in captured.out
    assert exit_code == 0


def test_python_dash_m_pyprep_prints_version() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "pyprep"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert __version__ in result.stdout
