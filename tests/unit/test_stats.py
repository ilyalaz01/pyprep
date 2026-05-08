"""Tests for `pyprep.sdk.stats.StatsService` (T2.5).

Spec: `docs/PRD_progress_tracking.md`. The service aggregates `Review` rows
into per-scope retention and a weakness ranking. CardService supplies the
card.difficulty needed for XP and (transitively) the module_id for each
sphere. Persistence is abstracted via the `StatsRepository` protocol.
"""

from __future__ import annotations

import datetime as dt

import pytest

from pyprep.sdk.cards import CardService
from pyprep.sdk.content_loader import Card, ContentIndex, SphereContent
from pyprep.sdk.scheduler import Rating
from pyprep.sdk.sessions import Review
from pyprep.sdk.stats import StatsService

T0 = dt.datetime(2026, 5, 8, 12, 0, tzinfo=dt.UTC)


def _card(cid: str, sphere: str, *, module: int = 1, difficulty: int = 2) -> Card:
    return Card(
        id=cid,
        sphere_id=sphere,
        module_id=module,
        type="flip",
        topic=cid,
        difficulty=difficulty,
        tags=("core",),
        raw={},
    )


def _review(
    cid: str,
    sphere: str,
    rating: Rating,
    *,
    when: dt.datetime = T0,
    user: str = "u1",
) -> Review:
    return Review(
        id=f"r-{cid}-{when.isoformat()}",
        user_id=user,
        session_id="s1",
        card_id=cid,
        sphere_id=sphere,
        rating=rating,
        response_ms=1000,
        reviewed_at=when,
    )


@pytest.fixture
def cards() -> CardService:
    items = [
        _card("m1-s0-c1", "m1-s0", difficulty=1),
        _card("m1-s0-c2", "m1-s0", difficulty=3),
        _card("m1-s1-c1", "m1-s1", difficulty=2),
        _card("m1-s2-c1", "m1-s2", module=1, difficulty=4),
        _card("m2-s0-c1", "m2-s0", module=2, difficulty=2),
    ]
    spheres: dict[str, SphereContent] = {
        sid: SphereContent(sid, m, tuple(c for c in items if c.sphere_id == sid), "")
        for (sid, m) in {(c.sphere_id, c.module_id) for c in items}
    }
    modules: dict[int, list[str]] = {}
    for c in items:
        modules.setdefault(c.module_id, []).append(c.sphere_id)
    return CardService(
        ContentIndex(
            cards={c.id: c for c in items},
            spheres=spheres,
            modules={m: tuple(sorted(set(s))) for m, s in modules.items()},
        )
    )


class _FakeStatsRepo:
    def __init__(self, rows: list[Review] | None = None) -> None:
        self.rows: list[Review] = list(rows or [])

    def list_reviews(self, user_id: str) -> list[Review]:
        return [r for r in self.rows if r.user_id == user_id]


def test_overview_with_no_reviews(cards: CardService) -> None:
    svc = StatsService(reviews=_FakeStatsRepo(), cards=cards)

    o = svc.overview("u1")

    assert o.reviews_total == 0
    assert o.retention == 0.0
    assert o.streak == 0
    assert o.xp == 0.0


def test_overview_aggregates_correctly(cards: CardService) -> None:
    repo = _FakeStatsRepo(
        [
            _review("m1-s0-c1", "m1-s0", Rating.Good),  # diff 1, mult 1.0 → 1.0 xp
            _review("m1-s0-c2", "m1-s0", Rating.Hard),  # diff 3, mult 1.5 → 4.5 xp
            _review("m1-s1-c1", "m1-s1", Rating.Again),  # diff 2, mult 0   → 0 xp
            _review("m1-s2-c1", "m1-s2", Rating.Easy),  # diff 4, mult 1.0 → 4.0 xp
        ]
    )

    o = StatsService(reviews=repo, cards=cards).overview("u1")

    assert o.reviews_total == 4
    assert o.retention == pytest.approx(0.5)  # 2 correct / 4
    assert o.xp == pytest.approx(1.0 + 4.5 + 0.0 + 4.0)


def test_per_module_aggregates_across_spheres(cards: CardService) -> None:
    repo = _FakeStatsRepo(
        [
            _review("m1-s0-c1", "m1-s0", Rating.Good),
            _review("m1-s1-c1", "m1-s1", Rating.Good),
            _review("m1-s1-c1", "m1-s1", Rating.Again),
            _review("m2-s0-c1", "m2-s0", Rating.Good),
        ]
    )

    rows = StatsService(reviews=repo, cards=cards).per_module("u1")
    by_id = {r.module_id: r for r in rows}

    assert by_id[1].reviews_total == 3
    assert by_id[1].retention == pytest.approx(2 / 3)
    assert by_id[2].reviews_total == 1
    assert by_id[2].retention == 1.0


def test_per_sphere_aggregates(cards: CardService) -> None:
    repo = _FakeStatsRepo(
        [
            _review("m1-s0-c1", "m1-s0", Rating.Good),
            _review("m1-s0-c2", "m1-s0", Rating.Again),
            _review("m1-s1-c1", "m1-s1", Rating.Good),
        ]
    )

    rows = StatsService(reviews=repo, cards=cards).per_sphere("u1")
    by_id = {r.sphere_id: r for r in rows}

    assert by_id["m1-s0"].reviews_total == 2
    assert by_id["m1-s0"].retention == 0.5
    assert by_id["m1-s1"].reviews_total == 1
    assert by_id["m1-s1"].retention == 1.0


def test_weakness_top_n_excludes_low_volume(cards: CardService) -> None:
    rows = []
    for _ in range(3):  # only 3 reviews — below the 5 threshold
        rows.append(_review("m1-s0-c1", "m1-s0", Rating.Again))
    for _ in range(8):  # 8 reviews, all wrong
        rows.append(_review("m1-s1-c1", "m1-s1", Rating.Again))
    repo = _FakeStatsRepo(rows)

    top = StatsService(reviews=repo, cards=cards).weakness_top_n("u1", n=3)

    assert [s.sphere_id for s in top] == ["m1-s1"]


def test_weakness_top_n_ranks_by_score_descending(cards: CardService) -> None:
    rows = []
    rows += [_review("m1-s0-c1", "m1-s0", Rating.Again)] * 5  # 0% retention, vol 5
    rows += [_review("m1-s1-c1", "m1-s1", Rating.Good)] * 4
    rows += [_review("m1-s1-c1", "m1-s1", Rating.Again)] * 6  # 40% retention, vol 10
    rows += [_review("m1-s2-c1", "m1-s2", Rating.Good)] * 10  # 100% retention, vol 10
    repo = _FakeStatsRepo(rows)

    top = StatsService(reviews=repo, cards=cards).weakness_top_n("u1", n=3)

    # s0: (1-0)*ln(6) ≈ 1.79; s1: (1-0.4)*ln(11) ≈ 1.44; s2: 0
    assert [s.sphere_id for s in top] == ["m1-s0", "m1-s1", "m1-s2"]


def test_weakness_property_more_easy_lowers_score(cards: CardService) -> None:
    base = [_review("m1-s0-c1", "m1-s0", Rating.Again)] * 5
    score_before = StatsService(_FakeStatsRepo(list(base)), cards).per_sphere("u1")[0].weakness

    boosted = base + [_review("m1-s0-c1", "m1-s0", Rating.Easy)] * 10
    score_after = StatsService(_FakeStatsRepo(boosted), cards).per_sphere("u1")[0].weakness

    assert score_after < score_before


def test_daily_chart_buckets_by_utc_date(cards: CardService) -> None:
    repo = _FakeStatsRepo(
        [
            _review("m1-s0-c1", "m1-s0", Rating.Good, when=T0),
            _review("m1-s0-c1", "m1-s0", Rating.Again, when=T0),
            _review("m1-s0-c1", "m1-s0", Rating.Good, when=T0 + dt.timedelta(days=1)),
        ]
    )

    today = T0 + dt.timedelta(days=2)
    chart = StatsService(reviews=repo, cards=cards).daily_chart("u1", days=3, today=today)

    by_date = {row.date: row for row in chart}
    assert by_date[T0.date()].reviews_total == 2
    assert by_date[T0.date()].retention == 0.5
    assert by_date[(T0 + dt.timedelta(days=1)).date()].reviews_total == 1


def test_streak_counts_consecutive_utc_days(cards: CardService) -> None:
    repo = _FakeStatsRepo(
        [
            _review("m1-s0-c1", "m1-s0", Rating.Good, when=T0),
            _review("m1-s0-c1", "m1-s0", Rating.Good, when=T0 - dt.timedelta(days=1)),
            _review("m1-s0-c1", "m1-s0", Rating.Good, when=T0 - dt.timedelta(days=2)),
        ]
    )

    streak = StatsService(reviews=repo, cards=cards).streak("u1", today=T0)

    assert streak == 3


def test_streak_zero_if_today_has_no_review(cards: CardService) -> None:
    repo = _FakeStatsRepo(
        [_review("m1-s0-c1", "m1-s0", Rating.Good, when=T0 - dt.timedelta(days=2))]
    )

    streak = StatsService(reviews=repo, cards=cards).streak("u1", today=T0)

    assert streak == 0


def test_streak_uses_user_tz(cards: CardService) -> None:
    """A review at 23:30 UTC is on 'today' for a UTC user but on 'yesterday'
    for a New_York user (4-5h behind). Test that user_tz is honored."""
    late_utc = dt.datetime(2026, 5, 8, 23, 30, tzinfo=dt.UTC)  # 19:30 EDT
    repo = _FakeStatsRepo(
        [_review("m1-s0-c1", "m1-s0", Rating.Good, when=late_utc)]
    )
    today = dt.datetime(2026, 5, 9, 1, 0, tzinfo=dt.UTC)  # next-day in UTC, same day in NY

    utc_streak = StatsService(reviews=repo, cards=cards).streak(
        "u1", user_tz="UTC", today=today
    )
    ny_streak = StatsService(reviews=repo, cards=cards).streak(
        "u1", user_tz="America/New_York", today=today
    )

    assert utc_streak == 0  # in UTC, today=2026-05-09 has no review
    assert ny_streak == 1  # in NY, today=2026-05-08 (still) has the 19:30 review
