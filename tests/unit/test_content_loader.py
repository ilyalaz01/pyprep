"""Tests for `pyprep.sdk.content_loader.ContentLoader` (T2.1).

A synthetic content tree is constructed in tmp_path so the tests stay fast and
fully isolated from the real `content/` directory.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pyprep.sdk.content_loader import ContentLoader, ContentLoaderError

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO_ROOT / "content" / "schema" / "card.schema.json"

GOOD_CARD = {
    "id": "m1-s0-c1",
    "type": "flip",
    "topic": "demo",
    "difficulty": 1,
    "tags": ["t"],
    "question": "What is 1+1?",
    "answer": "Two — a trivial demo card.",
}


def _seed(root: Path, payload: dict, *, lesson_md: str | None = None) -> None:
    sphere_dir = root / "modules" / "01_demo"
    sphere_dir.mkdir(parents=True)
    (sphere_dir / "module.md").write_text("---\nmodule_id: 1\n---\n# demo\n")
    (sphere_dir / "00_demo.cards.json").write_text(json.dumps(payload))
    (sphere_dir / "00_demo.md").write_text(
        lesson_md or '---\nsphere_id: "m1-s0"\n---\n# demo lesson\n'
    )


def test_load_returns_index_keyed_by_card_id(tmp_path: Path) -> None:
    _seed(tmp_path, {"module_id": 1, "sphere_id": "m1-s0", "cards": [GOOD_CARD]})

    index = ContentLoader(tmp_path, schema_path=SCHEMA_PATH).load()

    card = index.cards["m1-s0-c1"]
    assert card.topic == "demo"
    assert card.sphere_id == "m1-s0"
    assert card.module_id == 1
    assert card.type == "flip"
    assert card.tags == ("t",)


def test_load_indexes_cards_by_sphere(tmp_path: Path) -> None:
    _seed(tmp_path, {"module_id": 1, "sphere_id": "m1-s0", "cards": [GOOD_CARD]})

    index = ContentLoader(tmp_path, schema_path=SCHEMA_PATH).load()

    sphere = index.spheres["m1-s0"]
    assert sphere.module_id == 1
    assert len(sphere.cards) == 1
    assert sphere.cards[0].id == "m1-s0-c1"
    assert index.modules[1] == ("m1-s0",)


def test_load_attaches_lesson_md(tmp_path: Path) -> None:
    lesson = '---\nsphere_id: "m1-s0"\n---\n# Hello sphere\nbody.'
    _seed(tmp_path, {"module_id": 1, "sphere_id": "m1-s0", "cards": [GOOD_CARD]}, lesson_md=lesson)

    index = ContentLoader(tmp_path, schema_path=SCHEMA_PATH).load()

    assert "Hello sphere" in index.spheres["m1-s0"].lesson_md


def test_load_raises_on_schema_violation(tmp_path: Path) -> None:
    bad = {**GOOD_CARD, "difficulty": 99}
    _seed(tmp_path, {"module_id": 1, "sphere_id": "m1-s0", "cards": [bad]})

    with pytest.raises(ContentLoaderError, match="schema"):
        ContentLoader(tmp_path, schema_path=SCHEMA_PATH).load()


def test_load_raises_on_duplicate_card_id(tmp_path: Path) -> None:
    _seed(tmp_path, {"module_id": 1, "sphere_id": "m1-s0", "cards": [GOOD_CARD, GOOD_CARD]})

    with pytest.raises(ContentLoaderError, match="duplicate"):
        ContentLoader(tmp_path, schema_path=SCHEMA_PATH).load()


def test_load_raises_when_wrapper_missing_sphere_id(tmp_path: Path) -> None:
    _seed(tmp_path, {"module_id": 1, "cards": [GOOD_CARD]})

    with pytest.raises(ContentLoaderError, match="sphere_id"):
        ContentLoader(tmp_path, schema_path=SCHEMA_PATH).load()


def test_load_real_content_tree() -> None:
    """The real `content/` tree must load cleanly via the SDK loader."""
    index = ContentLoader(REPO_ROOT / "content").load()

    assert "m1-s0-c1" in index.cards
    assert index.cards["m1-s0-c1"].sphere_id == "m1-s0"
    assert "m1-s6" in index.spheres
    assert 1 in index.modules
    assert index.modules[1][0] == "m1-s0"
