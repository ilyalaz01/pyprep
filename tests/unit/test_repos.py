"""Tests for `pyprep.sdk.repos.*` (T2.10).

SQLite in-memory: each test gets a fresh schema. The repos satisfy the
Protocols already declared by other services (`UserStore`,
`SessionStore`, `ReviewStore`, `StatsRepository`); these tests pin
behavior at the database boundary, not at the service level.

Owner asks pinned at this checkpoint:
- UNIQUE constraint on `users.email` at the DB level (test:
  `test_user_email_unique_at_db_level`).
- Index on `(reviews.user_id, reviews.due_at)` for queue queries
  (test: `test_due_index_present`).
"""

from __future__ import annotations

import datetime as dt
from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker

from pyprep.sdk.auth import EmailAlreadyExistsError, User
from pyprep.sdk.repos import (
    Base,
    ReviewRepository,
    SessionRepository,
    UserRepository,
)
from pyprep.sdk.scheduler import CardState, Rating
from pyprep.sdk.sessions import Review, Session as DomainSession

T0 = dt.datetime(2026, 5, 8, 12, 0, tzinfo=dt.UTC)


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine("sqlite://", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    with SessionLocal() as s:
        yield s


# ---------------------------------------------------------------- users -----


def test_user_create_get_by_email(session: Session) -> None:
    repo = UserRepository(session)
    user = User(
        id="u1",
        email="alice@example.com",
        password_hash="hash",
        created_at=T0,
        is_single_user=False,
    )

    repo.create(user)

    fetched = repo.get_by_email("alice@example.com")
    assert fetched == user
    assert repo.get("u1") == user


def test_user_get_by_email_returns_none_when_missing(session: Session) -> None:
    assert UserRepository(session).get_by_email("nobody@example.com") is None


def test_user_get_raises_keyerror_when_missing(session: Session) -> None:
    with pytest.raises(KeyError):
        UserRepository(session).get("does-not-exist")


def test_user_email_unique_at_db_level(session: Session) -> None:
    """Owner-flagged: UNIQUE constraint must be enforced by the DB,
    not by check-then-create (race window)."""
    repo = UserRepository(session)
    repo.create(
        User(id="u1", email="alice@example.com", password_hash="h1", created_at=T0)
    )

    with pytest.raises(EmailAlreadyExistsError):
        repo.create(
            User(id="u2", email="alice@example.com", password_hash="h2", created_at=T0)
        )


def test_user_email_has_unique_constraint_in_schema(session: Session) -> None:
    """Sanity-check the schema itself, not just behavior."""
    insp = inspect(session.get_bind())
    constraints = insp.get_unique_constraints("users")
    indexes = insp.get_indexes("users")
    has_unique = any(
        "email" in (c.get("column_names") or []) for c in constraints
    ) or any("email" in (i.get("column_names") or []) and i.get("unique") for i in indexes)
    assert has_unique


# ------------------------------------------------------------- sessions -----


def test_session_create_get_update(session: Session) -> None:
    repo = SessionRepository(session)
    s = DomainSession(
        id="s1",
        user_id="u1",
        mode="learn",
        started_at=T0,
        ended_at=None,
        queue=("c1", "c2"),
        cards_total=2,
        cards_correct=0,
    )

    from dataclasses import replace

    repo.create(s)
    assert repo.get("s1") == s

    ended = replace(s, ended_at=T0, cards_correct=2)
    repo.update(ended)
    assert repo.get("s1") == ended


# -------------------------------------------------------------- reviews -----


def _state(reps: int = 1) -> CardState:
    return CardState(
        stability=2.0,
        difficulty=5.0,
        last_review=T0,
        due=T0 + dt.timedelta(days=1),
        reps=reps,
        lapses=0,
        state="learning",
        step=0,
    )


def _review(rid: str, card: str, rating: Rating = Rating.Good, when: dt.datetime = T0) -> Review:
    return Review(
        id=rid,
        user_id="u1",
        session_id="s1",
        card_id=card,
        sphere_id="m1-s0",
        rating=rating,
        response_ms=1000,
        reviewed_at=when,
    )


def test_review_add_and_latest_state(session: Session) -> None:
    repo = ReviewRepository(session)

    repo.add(_review("r1", "c1"), _state(reps=1))
    repo.add(_review("r2", "c1", when=T0 + dt.timedelta(hours=1)), _state(reps=2))

    latest = repo.latest_state("u1", "c1")
    assert latest is not None
    assert latest.reps == 2


def test_review_latest_state_none_when_no_reviews(session: Session) -> None:
    assert ReviewRepository(session).latest_state("u1", "c1") is None


def test_review_due_card_ids_filters_by_due_at(session: Session) -> None:
    repo = ReviewRepository(session)
    past_state = CardState(
        stability=1.0,
        difficulty=5.0,
        last_review=T0,
        due=T0 - dt.timedelta(days=1),  # already due
        reps=1,
        lapses=0,
        state="review",
        step=0,
    )
    future_state = CardState(
        stability=10.0,
        difficulty=5.0,
        last_review=T0,
        due=T0 + dt.timedelta(days=10),
        reps=1,
        lapses=0,
        state="review",
        step=0,
    )

    repo.add(_review("r1", "c-due"), past_state)
    repo.add(_review("r2", "c-future"), future_state)

    due = repo.due_card_ids("u1", T0)

    assert due == ["c-due"]


def test_review_due_card_ids_uses_only_latest_review_per_card(session: Session) -> None:
    """A card may have many reviews; only the LATEST due_at counts."""
    repo = ReviewRepository(session)
    early = CardState(
        stability=1.0,
        difficulty=5.0,
        last_review=T0,
        due=T0 - dt.timedelta(days=1),  # was due
        reps=1,
        lapses=0,
        state="review",
        step=0,
    )
    later = CardState(
        stability=5.0,
        difficulty=5.0,
        last_review=T0 + dt.timedelta(hours=1),
        due=T0 + dt.timedelta(days=5),  # now not due
        reps=2,
        lapses=0,
        state="review",
        step=0,
    )

    repo.add(_review("r1", "c1", when=T0), early)
    repo.add(_review("r2", "c1", when=T0 + dt.timedelta(hours=1)), later)

    assert repo.due_card_ids("u1", T0) == []  # latest review pushes due into future


def test_review_reviewed_card_ids(session: Session) -> None:
    repo = ReviewRepository(session)
    repo.add(_review("r1", "c1"), _state())
    repo.add(_review("r2", "c2"), _state())

    assert repo.reviewed_card_ids("u1") == {"c1", "c2"}
    assert repo.reviewed_card_ids("u2") == set()


def test_review_new_cards_seen_today_count(session: Session) -> None:
    repo = ReviewRepository(session)
    repo.add(_review("r1", "c1", when=T0), _state(reps=1))
    repo.add(_review("r2", "c2", when=T0), _state(reps=1))
    repo.add(
        _review("r3", "c1", when=T0 + dt.timedelta(hours=1)), _state(reps=2)
    )  # not new
    repo.add(
        _review("r4", "c3", when=T0 - dt.timedelta(days=1)), _state(reps=1)
    )  # yesterday

    n = repo.new_cards_seen_today_count("u1", T0.date())

    assert n == 2  # c1, c2 — c3 was yesterday, c1's reps=2 review doesn't double-count


def test_review_list_reviews_for_stats(session: Session) -> None:
    repo = ReviewRepository(session)
    repo.add(_review("r1", "c1"), _state())
    repo.add(_review("r2", "c2", rating=Rating.Again), _state())

    rows = repo.list_reviews("u1")

    assert {r.id for r in rows} == {"r1", "r2"}
    assert {r.rating for r in rows} == {Rating.Good, Rating.Again}


def test_due_index_present(session: Session) -> None:
    """Owner-flagged: there must be an index on (user_id, due_at) so the
    review-queue query does not table-scan."""
    insp = inspect(session.get_bind())
    indexes = insp.get_indexes("reviews")
    target = [i for i in indexes if i.get("column_names") == ["user_id", "due_at"]]
    assert target, f"missing (user_id, due_at) index; have {indexes}"
