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
        queue = self._build_queue(user_id, mode, sphere_id, limit, daily_new_card_cap)
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
    ) -> SubmitResult:
        session = self._sessions.get(session_id)
        if session.ended_at is not None:
            raise SessionFinishedError(session_id)
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
        )
        self._reviews.add(review, next_state)
        delta = 1 if rating in _CORRECT else 0
        self._sessions.update(
            replace(session, cards_correct=session.cards_correct + delta)
        )
        return SubmitResult(next_state=next_state)

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

    def _build_queue(
        self,
        user_id: str,
        mode: SessionMode,
        sphere_id: str | None,
        limit: int,
        daily_new_card_cap: int,
    ) -> tuple[str, ...]:
        if mode == "learn":
            if sphere_id is None:
                raise ValueError("learn mode requires sphere_id")
            return tuple(self._new_in_sphere(user_id, sphere_id)[:limit])
        if mode == "review":
            ids = self._reviews.due_card_ids(user_id, self._clock(), sphere_id=sphere_id)
            return tuple(ids[:limit])
        if mode == "mixed":
            if sphere_id is None:
                raise ValueError("mixed mode requires sphere_id")
            return self._mixed_queue(user_id, sphere_id, limit, daily_new_card_cap)
        raise ValueError(f"unsupported session mode: {mode}")

    def _new_in_sphere(self, user_id: str, sphere_id: str) -> list[str]:
        seen = self._reviews.reviewed_card_ids(user_id, sphere_id=sphere_id)
        return [c.id for c in self._cards.by_sphere(sphere_id) if c.id not in seen]

    def _mixed_queue(
        self,
        user_id: str,
        sphere_id: str,
        limit: int,
        daily_new_card_cap: int,
    ) -> tuple[str, ...]:
        now = self._clock()
        new_today = self._reviews.new_cards_seen_today_count(user_id, now.date())
        new_remaining = max(0, daily_new_card_cap - new_today)
        new_pool = self._new_in_sphere(user_id, sphere_id)
        due_pool = self._reviews.due_card_ids(user_id, now, sphere_id=sphere_id)
        new_take = min(limit // 2, len(new_pool), new_remaining)
        due_take = min(limit - new_take, len(due_pool))
        # backfill from the other pool if budget remains
        remaining = limit - new_take - due_take
        if remaining and len(new_pool) > new_take and new_remaining > new_take:
            extra = min(remaining, len(new_pool) - new_take, new_remaining - new_take)
            new_take += extra
        return tuple(due_pool[:due_take] + new_pool[:new_take])
