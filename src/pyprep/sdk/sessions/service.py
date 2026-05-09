"""SessionService — pick cards, record reviews, advance state, finish."""

from __future__ import annotations

import datetime as dt
import uuid
from collections.abc import Callable
from dataclasses import replace

from pyprep.sdk.cards import CardService
from pyprep.sdk.scheduler import FSRSScheduler, Rating

from .models import (
    Review,
    Session,
    SessionFinishedError,
    SessionMode,
    SessionSummary,
    SubmitResult,
)
from .protocols import ReviewStore, SessionStore
from .queue_builder import build_queue

_CORRECT = {Rating.Good, Rating.Easy}


def _now_utc() -> dt.datetime:
    return dt.datetime.now(dt.UTC)


class SessionService:
    def __init__(
        self,
        *,
        cards: CardService,
        scheduler: FSRSScheduler,
        sessions: SessionStore,
        reviews: ReviewStore,
        clock: Callable[[], dt.datetime] = _now_utc,
        id_factory: Callable[[], str] = lambda: str(uuid.uuid4()),
    ) -> None:
        self._cards = cards
        self._scheduler = scheduler
        self._sessions = sessions
        self._reviews = reviews
        self._clock = clock
        self._new_id = id_factory

    def start(
        self,
        *,
        user_id: str,
        mode: SessionMode,
        sphere_id: str | None = None,
        limit: int = 20,
        daily_new_card_cap: int = 15,
    ) -> Session:
        queue = build_queue(
            cards=self._cards,
            reviews=self._reviews,
            user_id=user_id,
            mode=mode,
            sphere_id=sphere_id,
            limit=limit,
            daily_new_card_cap=daily_new_card_cap,
            now=self._clock(),
        )
        session = Session(
            id=self._new_id(),
            user_id=user_id,
            mode=mode,
            started_at=self._clock(),
            ended_at=None,
            queue=queue,
            cards_total=len(queue),
            cards_correct=0,
        )
        self._sessions.create(session)
        return session

    def submit(
        self,
        session_id: str,
        card_id: str,
        rating: Rating,
        response_ms: int,
        *,
        idempotency_key: str | None = None,
    ) -> SubmitResult:
        session = self._sessions.get(session_id)
        if session.ended_at is not None:
            raise SessionFinishedError(session_id)
        if idempotency_key is not None and (
            existing := self._reviews.find_by_idempotency_key(
                session_id, card_id, idempotency_key
            )
        ):
            return SubmitResult(next_state=existing[1])
        card = self._cards.get(card_id)
        now = self._clock()
        prior = self._reviews.latest_state(session.user_id, card_id)
        next_state = self._scheduler.next_due(
            prior_state=prior, rating=rating, reviewed_at=now
        )
        review = Review(
            id=self._new_id(),
            user_id=session.user_id,
            session_id=session.id,
            card_id=card_id,
            sphere_id=card.sphere_id,
            rating=rating,
            response_ms=response_ms,
            reviewed_at=now,
            idempotency_key=idempotency_key,
        )
        self._reviews.add(review, next_state)
        if rating in _CORRECT:
            self._sessions.increment_cards_correct(session.id)
        return SubmitResult(next_state=next_state)

    def preview_queue(
        self,
        *,
        user_id: str,
        mode: SessionMode = "review",
        sphere_id: str | None = None,
        limit: int = 20,
        daily_new_card_cap: int = 15,
    ) -> tuple[str, ...]:
        """Side-effect-free queue preview (N019). Same selection rules as
        `start()` but persists nothing — for the home-page review widget."""
        return build_queue(
            cards=self._cards,
            reviews=self._reviews,
            user_id=user_id,
            mode=mode,
            sphere_id=sphere_id,
            limit=limit,
            daily_new_card_cap=daily_new_card_cap,
            now=self._clock(),
        )

    def finish(self, session_id: str) -> SessionSummary:
        session = self._sessions.get(session_id)
        ended = replace(session, ended_at=self._clock())
        self._sessions.update(ended)
        retention = (
            session.cards_correct / session.cards_total
            if session.cards_total
            else 0.0
        )
        return SessionSummary(
            cards_total=session.cards_total,
            cards_correct=session.cards_correct,
            retention=retention,
        )
