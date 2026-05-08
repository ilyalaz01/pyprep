"""T2.5.2 — concurrent submits must not double-count `cards_correct`.

Uses real SQLAlchemy + a shared in-memory SQLite DB across threads. The
old `replace(session, cards_correct=session.cards_correct + 1)` pattern
is read-modify-write: two threads can both read 0 and both write 1,
losing one increment. The new atomic UPDATE pattern increments at the
database, eliminating the race.
"""

from __future__ import annotations

import datetime as dt
import threading

import pytest
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import Session, sessionmaker

from pyprep.sdk.cards import CardService
from pyprep.sdk.content_loader import Card, ContentIndex, SphereContent
from pyprep.sdk.repos import (
    Base,
    ReviewRepository,
    SessionRepository,
)
from pyprep.sdk.scheduler import FSRSScheduler, Rating
from pyprep.sdk.sessions import SessionService

T0 = dt.datetime(2026, 5, 8, 12, 0, tzinfo=dt.UTC)


def _card(cid: str) -> Card:
    return Card(
        id=cid,
        sphere_id="m1-s0",
        module_id=1,
        type="flip",
        topic=cid,
        difficulty=2,
        tags=("core",),
        raw={},
    )


@pytest.fixture
def engine_factory():
    """Shared in-memory SQLite + StaticPool so all threads see the same db."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture
def cards() -> CardService:
    items = [_card(f"m1-s0-c{i}") for i in range(1, 6)]
    sphere = SphereContent("m1-s0", 1, tuple(items), "")
    return CardService(
        ContentIndex(
            cards={c.id: c for c in items},
            spheres={"m1-s0": sphere},
            modules={1: ("m1-s0",)},
        )
    )


def test_concurrent_submits_dont_double_count_cards_correct(
    engine_factory: sessionmaker[Session], cards: CardService
) -> None:
    # Bootstrap one session row from the orchestrator
    boot_id_iter = iter(f"id-{i}" for i in range(1, 100))

    def boot_id() -> str:
        return next(boot_id_iter)

    with engine_factory() as boot_session:
        svc = SessionService(
            cards=cards,
            scheduler=FSRSScheduler(),
            sessions=SessionRepository(boot_session),
            reviews=ReviewRepository(boot_session),
            clock=lambda: T0,
            id_factory=boot_id,
        )
        s = svc.start(user_id="u1", mode="learn", sphere_id="m1-s0", limit=4)
        boot_session.commit()
    session_id = s.id

    # Each thread does ONE submit on a different card_id, all rated Good.
    cards_to_submit = ["m1-s0-c1", "m1-s0-c2", "m1-s0-c3", "m1-s0-c4"]
    barrier = threading.Barrier(len(cards_to_submit))
    errors: list[BaseException] = []
    review_id_seq = iter(f"rev-{i}" for i in range(1, 100))
    review_id_lock = threading.Lock()

    def thread_submit(card_id: str) -> None:
        try:
            with engine_factory() as worker_session:
                svc = SessionService(
                    cards=cards,
                    scheduler=FSRSScheduler(),
                    sessions=SessionRepository(worker_session),
                    reviews=ReviewRepository(worker_session),
                    clock=lambda: T0,
                    id_factory=lambda: _next_id(review_id_seq, review_id_lock),
                )
                barrier.wait()
                svc.submit(session_id, card_id, Rating.Good, 100)
                worker_session.commit()
        except BaseException as e:  # noqa: BLE001
            errors.append(e)

    threads = [threading.Thread(target=thread_submit, args=(cid,)) for cid in cards_to_submit]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert errors == [], f"thread errors: {errors!r}"

    with engine_factory() as verify:
        repo = SessionRepository(verify)
        final = repo.get(session_id)
        assert final.cards_correct == len(cards_to_submit), (
            f"expected {len(cards_to_submit)} but got {final.cards_correct} — "
            "race lost an increment"
        )


def _next_id(seq, lock: threading.Lock) -> str:
    with lock:
        return next(seq)
