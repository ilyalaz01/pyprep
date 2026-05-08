"""Tests for `pyprep.sdk.sessions.SessionService` (T2.4).

The service orchestrates a session lifecycle:
- `start(user_id, mode, sphere_id, limit)` picks cards, persists Session,
  returns Session with queue.
- `submit(session_id, card_id, rating, response_ms)` records a Review,
  advances the per-card CardState via FSRSScheduler, updates session stats.
- `finish(session_id)` marks ended_at and returns SessionSummary.

Persistence is abstracted behind two Protocols (`SessionStore`,
`ReviewStore`); the tests use in-memory fakes. SQLAlchemy implementations
land in T2.10.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import Callable

import pytest

from pyprep.sdk.cards import CardService
from pyprep.sdk.content_loader import Card, ContentIndex, SphereContent
from pyprep.sdk.scheduler import CardState, FSRSScheduler, Rating
from pyprep.sdk.sessions import (
    Review,
    Session,
    SessionFinishedError,
    SessionService,
)

T0 = dt.datetime(2026, 5, 8, 12, 0, tzinfo=dt.UTC)


def _card(cid: str, sphere: str = "m1-s0") -> Card:
    return Card(
        id=cid,
        sphere_id=sphere,
        module_id=1,
        type="flip",
        topic=cid,
        difficulty=2,
        tags=("core",),
        raw={},
    )


@pytest.fixture
def cards() -> CardService:
    items = [_card(f"m1-s0-c{i}") for i in range(1, 6)] + [
        _card("m1-s1-c1", sphere="m1-s1")
    ]
    spheres: dict[str, SphereContent] = {}
    for c in items:
        spheres.setdefault(
            c.sphere_id, SphereContent(c.sphere_id, 1, (), "")
        )
    spheres = {
        sid: SphereContent(sid, 1, tuple(c for c in items if c.sphere_id == sid), "")
        for sid in spheres
    }
    index = ContentIndex(
        cards={c.id: c for c in items},
        spheres=spheres,
        modules={1: tuple(sorted(spheres))},
    )
    return CardService(index)


class _FakeSessionStore:
    def __init__(self) -> None:
        self.rows: dict[str, Session] = {}

    def create(self, session: Session) -> None:
        self.rows[session.id] = session

    def get(self, session_id: str) -> Session:
        return self.rows[session_id]

    def update(self, session: Session) -> None:
        self.rows[session.id] = session


class _FakeReviewStore:
    def __init__(self) -> None:
        self.rows: list[Review] = []
        self.states: dict[tuple[str, str], CardState] = {}
        self.due: dict[str, list[str]] = {}

    def latest_state(self, user_id: str, card_id: str) -> CardState | None:
        return self.states.get((user_id, card_id))

    def add(self, review: Review, state: CardState) -> None:
        self.rows.append(review)
        self.states[(review.user_id, review.card_id)] = state

    def due_card_ids(
        self, user_id: str, now: dt.datetime, *, sphere_id: str | None = None
    ) -> list[str]:
        del now, sphere_id
        return list(self.due.get(user_id, []))

    def reviewed_card_ids(
        self, user_id: str, *, sphere_id: str | None = None
    ) -> set[str]:
        del sphere_id
        return {cid for (uid, cid) in self.states if uid == user_id}


@pytest.fixture
def stores() -> tuple[_FakeSessionStore, _FakeReviewStore]:
    return _FakeSessionStore(), _FakeReviewStore()


@pytest.fixture
def service(
    cards: CardService,
    stores: tuple[_FakeSessionStore, _FakeReviewStore],
) -> SessionService:
    sessions, reviews = stores
    clock: Callable[[], dt.datetime] = lambda: T0
    ids = iter(f"sess-{i}" for i in range(1, 100))
    return SessionService(
        cards=cards,
        scheduler=FSRSScheduler(),
        sessions=sessions,
        reviews=reviews,
        clock=clock,
        id_factory=lambda: next(ids),
    )


def test_start_learn_picks_new_cards_in_sphere(service, stores) -> None:
    sessions, _ = stores

    s = service.start(user_id="u1", mode="learn", sphere_id="m1-s0", limit=3)

    assert s.id == "sess-1"
    assert s.user_id == "u1"
    assert s.mode == "learn"
    assert s.started_at == T0
    assert s.ended_at is None
    assert s.queue == ("m1-s0-c1", "m1-s0-c2", "m1-s0-c3")
    assert s.cards_total == 3
    assert s.cards_correct == 0
    assert sessions.get("sess-1") == s


def test_start_learn_excludes_already_reviewed(service, stores) -> None:
    _, reviews = stores
    reviews.states[("u1", "m1-s0-c1")] = _dummy_state()
    reviews.states[("u1", "m1-s0-c2")] = _dummy_state()

    s = service.start(user_id="u1", mode="learn", sphere_id="m1-s0", limit=10)

    assert s.queue == ("m1-s0-c3", "m1-s0-c4", "m1-s0-c5")


def test_start_review_uses_due_cards(service, stores) -> None:
    _, reviews = stores
    reviews.due["u1"] = ["m1-s0-c2", "m1-s0-c4"]

    s = service.start(user_id="u1", mode="review", limit=10)

    assert s.queue == ("m1-s0-c2", "m1-s0-c4")


def test_start_review_respects_limit(service, stores) -> None:
    _, reviews = stores
    reviews.due["u1"] = [f"m1-s0-c{i}" for i in range(1, 6)]

    s = service.start(user_id="u1", mode="review", limit=2)

    assert s.queue == ("m1-s0-c1", "m1-s0-c2")


def test_submit_records_review_and_advances_state(service, stores) -> None:
    _, reviews = stores
    s = service.start(user_id="u1", mode="learn", sphere_id="m1-s0", limit=2)

    result = service.submit(
        session_id=s.id, card_id="m1-s0-c1", rating=Rating.Good, response_ms=4200
    )

    assert len(reviews.rows) == 1
    rev = reviews.rows[0]
    assert rev.user_id == "u1"
    assert rev.card_id == "m1-s0-c1"
    assert rev.session_id == s.id
    assert rev.sphere_id == "m1-s0"
    assert rev.rating is Rating.Good
    assert rev.response_ms == 4200
    assert result.next_state.reps == 1
    assert reviews.states[("u1", "m1-s0-c1")] == result.next_state


def test_submit_increments_correct_on_good_or_easy(service, stores) -> None:
    sessions, _ = stores
    s = service.start(user_id="u1", mode="learn", sphere_id="m1-s0", limit=4)

    service.submit(s.id, "m1-s0-c1", Rating.Good, 1000)
    service.submit(s.id, "m1-s0-c2", Rating.Easy, 1000)
    service.submit(s.id, "m1-s0-c3", Rating.Hard, 1000)
    service.submit(s.id, "m1-s0-c4", Rating.Again, 1000)

    final = sessions.get(s.id)
    assert final.cards_correct == 2  # only Good + Easy count


def test_submit_chains_prior_state_into_scheduler(service, stores) -> None:
    _, reviews = stores
    s = service.start(user_id="u1", mode="learn", sphere_id="m1-s0", limit=1)
    service.submit(s.id, "m1-s0-c1", Rating.Good, 500)

    s2 = service.start(user_id="u1", mode="review", limit=1)
    reviews.due["u1"] = ["m1-s0-c1"]
    s2 = service.start(user_id="u1", mode="review", limit=1)

    result = service.submit(s2.id, "m1-s0-c1", Rating.Good, 500)
    assert result.next_state.reps == 2


def test_submit_raises_on_unknown_card(service) -> None:
    s = service.start(user_id="u1", mode="learn", sphere_id="m1-s0", limit=1)

    with pytest.raises(KeyError, match="m9-s9-c9"):
        service.submit(s.id, "m9-s9-c9", Rating.Good, 100)


def test_submit_raises_when_session_finished(service) -> None:
    s = service.start(user_id="u1", mode="learn", sphere_id="m1-s0", limit=1)
    service.finish(s.id)

    with pytest.raises(SessionFinishedError):
        service.submit(s.id, "m1-s0-c1", Rating.Good, 100)


def test_finish_marks_ended_at_and_returns_summary(service, stores) -> None:
    sessions, _ = stores
    s = service.start(user_id="u1", mode="learn", sphere_id="m1-s0", limit=2)
    service.submit(s.id, "m1-s0-c1", Rating.Good, 100)
    service.submit(s.id, "m1-s0-c2", Rating.Again, 100)

    summary = service.finish(s.id)

    assert summary.cards_total == 2
    assert summary.cards_correct == 1
    assert summary.retention == pytest.approx(0.5)
    assert sessions.get(s.id).ended_at == T0


def _dummy_state() -> CardState:
    return CardState(
        stability=1.0,
        difficulty=5.0,
        last_review=T0,
        due=T0 + dt.timedelta(days=1),
        reps=1,
        lapses=0,
        state="learning",
        step=0,
    )
