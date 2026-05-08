"""Tests for `pyprep.sdk.cards.CardService` (T2.2).

CardService is a thin query layer over `ContentIndex`. It does not own
content — it is constructed with an index and exposes filters that
SessionService and the future REST API need.
"""

from __future__ import annotations

import pytest

from pyprep.sdk.cards import CardNotFoundError, CardService
from pyprep.sdk.content_loader import Card, ContentIndex, SphereContent


def _card(cid: str, *, sphere: str, kind: str, diff: int, tags: tuple[str, ...]) -> Card:
    return Card(
        id=cid,
        sphere_id=sphere,
        module_id=int(sphere[1]),
        type=kind,
        topic=f"topic for {cid}",
        difficulty=diff,
        tags=tags,
        raw={},
    )


@pytest.fixture
def index() -> ContentIndex:
    cards = [
        _card("m1-s0-c1", sphere="m1-s0", kind="flip", diff=1, tags=("warmup", "core")),
        _card("m1-s0-c2", sphere="m1-s0", kind="code_trap", diff=3, tags=("core",)),
        _card("m1-s0-c3", sphere="m1-s0", kind="flip", diff=5, tags=("hard",)),
        _card("m1-s1-c1", sphere="m1-s1", kind="multiple_choice", diff=2, tags=("core",)),
        _card("m1-s1-c2", sphere="m1-s1", kind="code_task", diff=4, tags=("hard", "code")),
    ]
    by_sphere: dict[str, list[Card]] = {}
    for c in cards:
        by_sphere.setdefault(c.sphere_id, []).append(c)
    spheres = {
        sid: SphereContent(sphere_id=sid, module_id=1, cards=tuple(items), lesson_md="")
        for sid, items in by_sphere.items()
    }
    return ContentIndex(
        cards={c.id: c for c in cards},
        spheres=spheres,
        modules={1: tuple(sorted(spheres))},
    )


def test_get_returns_card(index: ContentIndex) -> None:
    svc = CardService(index)

    assert svc.get("m1-s0-c1").topic == "topic for m1-s0-c1"


def test_get_raises_on_missing(index: ContentIndex) -> None:
    svc = CardService(index)

    with pytest.raises(CardNotFoundError, match="m1-s9-c9"):
        svc.get("m1-s9-c9")


def test_by_sphere(index: ContentIndex) -> None:
    svc = CardService(index)

    ids = [c.id for c in svc.by_sphere("m1-s0")]

    assert ids == ["m1-s0-c1", "m1-s0-c2", "m1-s0-c3"]


def test_by_sphere_unknown_returns_empty(index: ContentIndex) -> None:
    svc = CardService(index)

    assert svc.by_sphere("m9-s9") == []


def test_by_type(index: ContentIndex) -> None:
    svc = CardService(index)

    ids = sorted(c.id for c in svc.by_type("flip"))

    assert ids == ["m1-s0-c1", "m1-s0-c3"]


def test_by_tag(index: ContentIndex) -> None:
    svc = CardService(index)

    ids = sorted(c.id for c in svc.by_tag("core"))

    assert ids == ["m1-s0-c1", "m1-s0-c2", "m1-s1-c1"]


def test_by_difficulty_range_inclusive(index: ContentIndex) -> None:
    svc = CardService(index)

    ids = sorted(c.id for c in svc.by_difficulty_range(2, 4))

    assert ids == ["m1-s0-c2", "m1-s1-c1", "m1-s1-c2"]


def test_query_composes_filters(index: ContentIndex) -> None:
    svc = CardService(index)

    result = svc.query(sphere_id="m1-s0", type="flip", min_difficulty=4)
    ids = [c.id for c in result]

    assert ids == ["m1-s0-c3"]


def test_query_with_tag(index: ContentIndex) -> None:
    svc = CardService(index)

    result = svc.query(tags=("hard",))
    ids = sorted(c.id for c in result)

    assert ids == ["m1-s0-c3", "m1-s1-c2"]


def test_query_with_no_filters_returns_all(index: ContentIndex) -> None:
    svc = CardService(index)

    assert len(svc.query()) == 5


def test_query_max_difficulty(index: ContentIndex) -> None:
    svc = CardService(index)

    ids = sorted(c.id for c in svc.query(max_difficulty=2))

    assert ids == ["m1-s0-c1", "m1-s1-c1"]


def test_query_multiple_tags_requires_all(index: ContentIndex) -> None:
    svc = CardService(index)

    result = svc.query(tags=("hard", "code"))
    ids = [c.id for c in result]

    assert ids == ["m1-s1-c2"]
