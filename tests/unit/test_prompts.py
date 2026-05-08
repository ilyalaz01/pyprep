"""Tests for `pyprep.sdk.prompts.MockPromptService` (T2.6).

Spec: `docs/PRD_mock_interview_prompts.md`. Generation is a pure function:
same `MockPromptRequest` produces the same `MockPrompt` (the `seed`
parameter rotates content stably).
"""

from __future__ import annotations

import pytest

from pyprep.sdk.cards import CardService
from pyprep.sdk.content_loader import Card, ContentIndex, SphereContent
from pyprep.sdk.prompts import MockPrompt, MockPromptRequest, MockPromptService

_TEMPLATE = (
    "Duration: {{duration_minutes}}min. Role: {{role_label}} ({{candidate_level}}). "
    "Mix: concept={{pct_concept}}%, code_trap={{pct_code_trap}}%, "
    "design={{pct_design}}%, practical={{pct_practical}}%. "
    "Topics ({{order_label}}, n={{question_count}}):\n{{topic_list}}"
)


def _card(cid: str, sphere: str, *, difficulty: int = 2, module: int = 1) -> Card:
    return Card(
        id=cid,
        sphere_id=sphere,
        module_id=module,
        type="flip",
        topic=f"topic-{cid}",
        difficulty=difficulty,
        tags=("core",),
        raw={},
    )


@pytest.fixture
def cards() -> CardService:
    items = [
        _card("m1-s0-c1", "m1-s0", difficulty=1),
        _card("m1-s0-c2", "m1-s0", difficulty=2),
        _card("m1-s0-c3", "m1-s0", difficulty=4),
        _card("m1-s1-c1", "m1-s1", difficulty=2),
        _card("m1-s1-c2", "m1-s1", difficulty=3),
        _card("m2-s0-c1", "m2-s0", module=2, difficulty=2),
    ]
    spheres = {
        sid: SphereContent(sid, m, tuple(c for c in items if c.sphere_id == sid), "")
        for (sid, m) in {(c.sphere_id, c.module_id) for c in items}
    }
    return CardService(
        ContentIndex(
            cards={c.id: c for c in items},
            spheres=spheres,
            modules={1: ("m1-s0", "m1-s1"), 2: ("m2-s0",)},
        )
    )


def test_generate_filters_by_spheres(cards: CardService) -> None:
    svc = MockPromptService(cards=cards, template=_TEMPLATE)
    req = MockPromptRequest(spheres=("m1-s0",), count=5, seed=0)

    out = svc.generate(req)

    assert isinstance(out, MockPrompt)
    assert all(cid.startswith("m1-s0-") for cid in out.cards_used)
    assert len(out.cards_used) == 3  # only 3 cards in m1-s0


def test_generate_filters_by_modules(cards: CardService) -> None:
    svc = MockPromptService(cards=cards, template=_TEMPLATE)

    out = svc.generate(MockPromptRequest(modules=(2,), count=5, seed=0))

    assert out.cards_used == ("m2-s0-c1",)


def test_generate_filters_by_difficulty_band(cards: CardService) -> None:
    svc = MockPromptService(cards=cards, template=_TEMPLATE)

    out = svc.generate(
        MockPromptRequest(difficulty_min=2, difficulty_max=2, count=10, seed=0)
    )

    assert set(out.cards_used) == {"m1-s0-c2", "m1-s1-c1", "m2-s0-c1"}


def test_generate_is_deterministic(cards: CardService) -> None:
    svc = MockPromptService(cards=cards, template=_TEMPLATE)
    req = MockPromptRequest(spheres=("m1-s0", "m1-s1"), count=4, seed=42)

    a = svc.generate(req)
    b = svc.generate(req)

    assert a == b


def test_generate_different_seed_changes_order(cards: CardService) -> None:
    svc = MockPromptService(cards=cards, template=_TEMPLATE)
    base = MockPromptRequest(spheres=("m1-s0", "m1-s1"), count=5, seed=1)
    other = MockPromptRequest(spheres=("m1-s0", "m1-s1"), count=5, seed=999)

    a = svc.generate(base)
    b = svc.generate(other)

    assert sorted(a.cards_used) == sorted(b.cards_used)
    assert a.cards_used != b.cards_used  # order differs


def test_generate_renders_request_metadata(cards: CardService) -> None:
    svc = MockPromptService(cards=cards, template=_TEMPLATE)

    out = svc.generate(
        MockPromptRequest(
            spheres=("m1-s0",),
            count=2,
            seed=0,
            duration_minutes=45,
            role_label="QA Eng",
            candidate_level="junior-strong",
        )
    )

    assert "Duration: 45min" in out.text
    assert "Role: QA Eng (junior-strong)" in out.text
    assert "topic-m1-s0-" in out.text
    assert out.estimated_minutes == 45


def test_generate_renders_type_mix(cards: CardService) -> None:
    svc = MockPromptService(cards=cards, template=_TEMPLATE)

    out = svc.generate(
        MockPromptRequest(
            spheres=("m1-s0",),
            count=1,
            seed=0,
            type_mix=(("concept", 25), ("code_trap", 50), ("design", 10), ("practical", 15)),
        )
    )

    assert "concept=25%" in out.text
    assert "code_trap=50%" in out.text
    assert "design=10%" in out.text
    assert "practical=15%" in out.text


def test_generate_count_caps_to_available(cards: CardService) -> None:
    svc = MockPromptService(cards=cards, template=_TEMPLATE)

    out = svc.generate(MockPromptRequest(spheres=("m2-s0",), count=99, seed=0))

    assert len(out.cards_used) == 1


def test_topic_list_does_not_include_answers(cards: CardService) -> None:
    """Card.raw may carry `answer`/`solution_code`; the prompt must not."""
    items = [
        Card(
            id="m1-s0-c1",
            sphere_id="m1-s0",
            module_id=1,
            type="flip",
            topic="visible-topic",
            difficulty=2,
            tags=(),
            raw={"answer": "SECRET-ANSWER", "solution_code": "SECRET-CODE"},
        )
    ]
    spheres = {"m1-s0": SphereContent("m1-s0", 1, tuple(items), "")}
    cs = CardService(
        ContentIndex(
            cards={c.id: c for c in items},
            spheres=spheres,
            modules={1: ("m1-s0",)},
        )
    )
    svc = MockPromptService(cards=cs, template=_TEMPLATE)

    out = svc.generate(MockPromptRequest(spheres=("m1-s0",), count=1, seed=0))

    assert "visible-topic" in out.text
    assert "SECRET-ANSWER" not in out.text
    assert "SECRET-CODE" not in out.text


def test_weakness_focus_skews_toward_low_retention_sphere(cards: CardService) -> None:
    """When weakness_focus=true with a stats source where m1-s1 has 0%
    retention and m1-s0 has 100%, the sample of count=2 from a candidate
    pool of 3+2 cards should pull predominantly from m1-s1."""
    from pyprep.sdk.scheduler import Rating
    from pyprep.sdk.sessions import Review
    from pyprep.sdk.stats import StatsService

    import datetime as dt

    rows = [
        Review(
            id=f"r{i}",
            user_id="u1",
            session_id="s1",
            card_id="m1-s0-c1",
            sphere_id="m1-s0",
            rating=Rating.Good,
            response_ms=1,
            reviewed_at=dt.datetime(2026, 5, 8, tzinfo=dt.UTC),
        )
        for i in range(10)
    ] + [
        Review(
            id=f"rb{i}",
            user_id="u1",
            session_id="s1",
            card_id="m1-s1-c1",
            sphere_id="m1-s1",
            rating=Rating.Again,
            response_ms=1,
            reviewed_at=dt.datetime(2026, 5, 8, tzinfo=dt.UTC),
        )
        for i in range(10)
    ]

    class _Repo:
        def list_reviews(self, user_id: str) -> list[Review]:
            return rows if user_id == "u1" else []

    stats = StatsService(reviews=_Repo(), cards=cards)
    svc = MockPromptService(cards=cards, template=_TEMPLATE, stats=stats)

    out = svc.generate(
        MockPromptRequest(
            user_id="u1",
            spheres=("m1-s0", "m1-s1"),
            count=2,
            seed=0,
            weakness_focus=True,
        )
    )

    weak_count = sum(1 for cid in out.cards_used if cid.startswith("m1-s1-"))
    assert weak_count >= 1  # weakness focus pulls weak cards in
