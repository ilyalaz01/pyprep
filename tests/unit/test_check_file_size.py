"""T0.11 — file-size enforcement (max 150 LOC, blanks & comments excluded)."""

from __future__ import annotations

from pathlib import Path

import pytest

from pyprep.tools.check_file_size import count_loc, find_violations, main


def _write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def test_count_loc_python_excludes_blanks_and_comments(tmp_path: Path) -> None:
    src = _write(
        tmp_path / "a.py",
        "# a header comment\n"
        "\n"
        "x = 1\n"
        "    # an indented comment\n"
        "y = 2  # trailing comment counts as code\n"
        "\n",
    )
    assert count_loc(src) == 2


def test_count_loc_typescript_excludes_blanks_and_line_comments(tmp_path: Path) -> None:
    src = _write(
        tmp_path / "a.ts",
        "// header\n"
        "\n"
        "const x = 1;\n"
        "    // indented\n"
        "const y = 2; // trailing counts\n",
    )
    assert count_loc(src) == 2


def test_find_violations_flags_files_over_threshold(tmp_path: Path) -> None:
    big = "\n".join(f"x = {i}" for i in range(20))
    _write(tmp_path / "src" / "a.py", big)
    violations = find_violations(tmp_path, max_loc=10)
    assert len(violations) == 1
    assert violations[0][0].name == "a.py"
    assert violations[0][1] == 20


def test_find_violations_empty_when_all_under_threshold(tmp_path: Path) -> None:
    _write(tmp_path / "src" / "a.py", "x = 1\ny = 2\n")
    assert find_violations(tmp_path, max_loc=10) == []


def test_main_returns_zero_when_clean(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _write(tmp_path / "src" / "a.py", "x = 1\n")
    monkeypatch.chdir(tmp_path)
    assert main() == 0


def test_main_returns_one_when_violations_exist(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    big = "\n".join(f"x = {i}" for i in range(200))
    _write(tmp_path / "src" / "huge.py", big)
    monkeypatch.chdir(tmp_path)
    assert main() == 1
