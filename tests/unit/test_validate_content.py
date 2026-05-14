"""T1.10 — content validator (schema, ID uniqueness, sphere refs, min cards)."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

from pyprep.tools.validate_content import (
    main,
    parse_curriculum,
    validate,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
REAL_CONTENT = REPO_ROOT / "content"


def _seed_fake_content(root: Path, *, sphere_id: str = "m9-s0", subtasks: int = 1) -> Path:
    """Build a minimal valid content/ tree at `root`."""
    schema_src = REAL_CONTENT / "schema" / "card.schema.json"
    (root / "schema").mkdir(parents=True)
    shutil.copy(schema_src, root / "schema" / "card.schema.json")

    curriculum_lines = ["# Test curriculum", "", "## Module 9", ""]
    sub_lines = "\n".join(
        f"  - `{sphere_id}-t{i + 1}` — sub-task {i + 1}" for i in range(subtasks)
    )
    curriculum_lines.append(f"- `{sphere_id}` — Test sphere")
    curriculum_lines.append(sub_lines)
    (root / "curriculum.md").write_text("\n".join(curriculum_lines), "utf-8")

    sphere_dir = root / "modules" / "09_test"
    sphere_dir.mkdir(parents=True)
    (sphere_dir / "00_test.cards.json").write_text(
        json.dumps(
            {
                "module_id": 9,
                "sphere_id": sphere_id,
                "cards": [
                    {
                        "id": f"{sphere_id}-c{i}",
                        "type": "flip",
                        "topic": f"Topic {i}",
                        "difficulty": 2,
                        "tags": ["t"],
                        "question": f"Question {i}?",
                        "answer": f"Answer {i}.",
                    }
                    for i in range(1, 3 * subtasks + 1)
                ],
            }
        ),
        "utf-8",
    )
    return root


def test_parse_curriculum_extracts_spheres_and_subtasks() -> None:
    md = (
        "# Curriculum\n\n"
        "## Module 1\n\n"
        "- `m1-s0` — Intro\n"
        "  - `m1-s0-t1` — first\n"
        "  - `m1-s0-t2` — second\n"
        "\n"
        "- `m1-s1` — Next\n"
        "  - `m1-s1-t1` — only\n"
    )
    parsed = parse_curriculum(md)
    assert parsed == {"m1-s0": ["m1-s0-t1", "m1-s0-t2"], "m1-s1": ["m1-s1-t1"]}


def test_validate_passes_on_real_repo_content() -> None:
    assert validate(REAL_CONTENT) == []


def test_validate_passes_on_seeded_content(tmp_path: Path) -> None:
    _seed_fake_content(tmp_path)
    assert validate(tmp_path) == []


def test_validate_flags_duplicate_id(tmp_path: Path) -> None:
    _seed_fake_content(tmp_path)
    cards_path = tmp_path / "modules" / "09_test" / "00_test.cards.json"
    data = json.loads(cards_path.read_text("utf-8"))
    data["cards"][1]["id"] = data["cards"][0]["id"]
    cards_path.write_text(json.dumps(data), "utf-8")
    errors = validate(tmp_path)
    assert any("duplicate id" in e for e in errors)


def test_validate_flags_schema_violation(tmp_path: Path) -> None:
    _seed_fake_content(tmp_path)
    cards_path = tmp_path / "modules" / "09_test" / "00_test.cards.json"
    data = json.loads(cards_path.read_text("utf-8"))
    del data["cards"][0]["topic"]
    cards_path.write_text(json.dumps(data), "utf-8")
    errors = validate(tmp_path)
    assert any("topic" in e for e in errors)


def test_validate_flags_unknown_sphere_id(tmp_path: Path) -> None:
    _seed_fake_content(tmp_path)
    cards_path = tmp_path / "modules" / "09_test" / "00_test.cards.json"
    data = json.loads(cards_path.read_text("utf-8"))
    data["sphere_id"] = "m9-s99"
    cards_path.write_text(json.dumps(data), "utf-8")
    errors = validate(tmp_path)
    assert any("not in curriculum" in e for e in errors)


def test_validate_flags_insufficient_cards(tmp_path: Path) -> None:
    _seed_fake_content(tmp_path, subtasks=2)  # requires 6 cards
    cards_path = tmp_path / "modules" / "09_test" / "00_test.cards.json"
    data = json.loads(cards_path.read_text("utf-8"))
    data["cards"] = data["cards"][:2]  # too few
    cards_path.write_text(json.dumps(data), "utf-8")
    errors = validate(tmp_path)
    assert any("< 6 required" in e for e in errors)


def test_main_returns_zero_when_clean(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed_fake_content(tmp_path / "content")
    monkeypatch.chdir(tmp_path)
    assert main() == 0


def test_main_returns_one_when_violations(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed_fake_content(tmp_path / "content")
    bad = tmp_path / "content" / "modules" / "09_test" / "00_test.cards.json"
    data = json.loads(bad.read_text("utf-8"))
    del data["cards"][0]["topic"]
    bad.write_text(json.dumps(data), "utf-8")
    monkeypatch.chdir(tmp_path)
    assert main() == 1


# ---------- T2.5.4 — code_task execution gate ----------------------------

_CT_SOLUTION_OK = "def add(a, b):\n    return a + b\n"
_CT_SOLUTION_BROKEN = "def add(a, b):\n    return a - b  # bug\n"
_CT_TESTS = (
    "from solution import add\n\n"
    "def test_add_basic():\n    assert add(2, 3) == 5\n"
)


def _seed_with_code_task(tmp_path: Path, *, solution: str) -> Path:
    """Build a minimal valid content/ tree containing one passing flip
    card AND one code_task card (whose solution we control)."""
    _seed_fake_content(tmp_path)
    cards_path = tmp_path / "modules" / "09_test" / "00_test.cards.json"
    data = json.loads(cards_path.read_text("utf-8"))
    data["cards"].append(
        {
            "id": "m9-s0-c99",
            "type": "code_task",
            "topic": "Add two numbers",
            "difficulty": 1,
            "tags": ["t"],
            "prompt_md": "Implement `add(a, b)` returning `a + b`. Twenty chars+.",
            "starter_code": "def add(a, b):\n    ...\n",
            "solution_code": solution,
            "tests": _CT_TESTS,
        }
    )
    cards_path.write_text(json.dumps(data), "utf-8")
    return tmp_path


def test_validator_fails_when_solution_does_not_pass_its_tests(
    tmp_path: Path,
) -> None:
    _seed_with_code_task(tmp_path, solution=_CT_SOLUTION_BROKEN)

    errors = validate(tmp_path)

    assert any(
        "code_task" in e and "m9-s0-c99" in e for e in errors
    ), f"expected code_task failure for m9-s0-c99 in {errors!r}"


def test_validator_passes_when_solution_passes_its_tests(tmp_path: Path) -> None:
    _seed_with_code_task(tmp_path, solution=_CT_SOLUTION_OK)
    assert validate(tmp_path) == []


def test_validator_skip_execution_does_not_run_solutions(tmp_path: Path) -> None:
    """The --skip-execution flag lets dev iteration skip the slow pytest
    subprocesses. A broken solution must NOT trip the schema gate alone."""
    _seed_with_code_task(tmp_path, solution=_CT_SOLUTION_BROKEN)

    assert validate(tmp_path, execute_code_tasks=False) == []


# --- T4.5.3 / N029: emoji content-lint regression guards ---------------


def _seed_with_lesson_text(tmp_path: Path, lesson_text: str) -> Path:
    """Seed valid content + a lesson .md file with custom body."""
    _seed_fake_content(tmp_path)
    sphere_dir = tmp_path / "modules" / "09_test"
    (sphere_dir / "00_test.md").write_text(lesson_text, "utf-8")
    return tmp_path


def test_emoji_lint_flags_decorative_glyphs_in_lessons(tmp_path: Path) -> None:
    _seed_with_lesson_text(tmp_path, "## Concept ⚠️\n\nBody with 🚀 launch.\n")
    errors = validate(tmp_path, execute_code_tasks=False)
    assert any("emoji" in e and "N029" in e for e in errors), errors


def test_emoji_lint_passes_clean_lesson(tmp_path: Path) -> None:
    _seed_with_lesson_text(tmp_path, "## Concept\n\nBody, no decorations.\n")
    errors = validate(tmp_path, execute_code_tasks=False)
    assert all("emoji" not in e for e in errors)


def test_emoji_lint_flags_emoji_in_card_json(tmp_path: Path) -> None:
    """Card JSON wrappers are also content — same rule applies."""
    _seed_fake_content(tmp_path)
    cards_path = tmp_path / "modules" / "09_test" / "00_test.cards.json"
    cards_path.write_text(
        cards_path.read_text("utf-8").replace('"Topic 1"', '"Topic 1 🚀"'),
        "utf-8",
    )
    errors = validate(tmp_path, execute_code_tasks=False)
    assert any("emoji" in e for e in errors), errors


# --- T10.8 / N047: credential-shape content lint regression guards -----


def test_secret_lint_flags_aws_access_key(tmp_path: Path) -> None:
    _seed_with_lesson_text(tmp_path, "## Bad\n\nDo not paste `AKIAIOSFODNN7XBTSAMS` here.\n")
    errors = validate(tmp_path, execute_code_tasks=False)
    assert any("N047" in e and "AKIA" in e for e in errors), errors


def test_secret_lint_flags_full_jwt(tmp_path: Path) -> None:
    jwt = (
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        ".eyJ1c2VyIjoiYWxpY2UifQ"
        ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    )
    _seed_with_lesson_text(tmp_path, f"## Leak\n\nA leaked token: `{jwt}`.\n")
    errors = validate(tmp_path, execute_code_tasks=False)
    assert any("N047" in e and "JWT" in e for e in errors), errors


def test_secret_lint_flags_bcrypt_hash(tmp_path: Path) -> None:
    bcrypt = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
    _seed_with_lesson_text(tmp_path, f"## Hash\n\nstored: `{bcrypt}`.\n")
    errors = validate(tmp_path, execute_code_tasks=False)
    assert any("N047" in e and "bcrypt" in e for e in errors), errors


def test_secret_lint_flags_ghp_token(tmp_path: Path) -> None:
    pat = "ghp_1234567890abcdef1234567890abcdef1234"
    _seed_with_lesson_text(tmp_path, f"## Leak\n\nA PAT: `{pat}`.\n")
    errors = validate(tmp_path, execute_code_tasks=False)
    assert any("N047" in e and "ghp_" in e for e in errors), errors


def test_secret_lint_exempts_redacted_substring(tmp_path: Path) -> None:
    """Match containing REDACTED is treated as a teaching placeholder."""
    _seed_with_lesson_text(tmp_path, "## Teaching\n\nKey: `AKIAREDACTEDPLACE` (fake).\n")
    errors = validate(tmp_path, execute_code_tasks=False)
    assert all("N047" not in e for e in errors), errors


def test_secret_lint_exempts_actions_sha_pinning(tmp_path: Path) -> None:
    """40-hex SHA after `actions/<name>@` is GitHub Actions pinning — public, exempt."""
    sha_pin = "actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab"
    _seed_with_lesson_text(tmp_path, f"## Pinning\n\n- uses: {sha_pin}\n")
    errors = validate(tmp_path, execute_code_tasks=False)
    assert all("N047" not in e for e in errors), errors


def test_secret_lint_flags_bare_sha_outside_actions_context(tmp_path: Path) -> None:
    """A 40-hex string with no `actions/<name>@` prefix is flagged."""
    _seed_with_lesson_text(
        tmp_path, "## Hash\n\nSHA1: `8e5e7e5ab8b370d6c329ec480221332ada57f0ab`.\n"
    )
    errors = validate(tmp_path, execute_code_tasks=False)
    assert any("N047" in e and "40-hex" in e for e in errors), errors


def test_secret_lint_passes_truncated_jwt_body(tmp_path: Path) -> None:
    """A lone base64 fragment without 3-part `.`-separated structure is not a JWT."""
    _seed_with_lesson_text(
        tmp_path, "## Decode\n\nThe body `eyJ1c2VyX2lkIjo0Mn0` decodes to JSON.\n"
    )
    errors = validate(tmp_path, execute_code_tasks=False)
    assert all("N047" not in e for e in errors), errors
