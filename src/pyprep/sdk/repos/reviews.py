"""ReviewRepository — SQLAlchemy impl of `ReviewStore` and `StatsRepository`.

A single SQLAlchemy class satisfies both Protocols because the underlying
data is shared: the `reviews` table is the source of truth for the live
review queue, retention, weakness, and XP aggregates; the `sessions`
table is the source of truth for wall-clock time-invested (ADR-027).
Both queries flow through the same SQLAlchemy `Session`.
"""

from __future__ import annotations

import datetime as dt
from typing import cast

from sqlalchemy import distinct, select
from sqlalchemy.orm import Session

from pyprep.sdk.scheduler import CardState, Rating
from pyprep.sdk.scheduler.fsrs_scheduler import StateName
from pyprep.sdk.sessions import Review
from pyprep.sdk.sessions import Session as DomainSession

from .database import ensure_utc
from .models import ReviewRow, SessionRow
from .sessions import _to_domain as _session_row_to_domain


class ReviewRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def add(self, review: Review, state: CardState) -> None:
        self._s.add(
            ReviewRow(
                id=review.id,
                user_id=review.user_id,
                session_id=review.session_id,
                card_id=review.card_id,
                sphere_id=review.sphere_id,
                rating=int(review.rating.value),
                response_ms=review.response_ms,
                reviewed_at=review.reviewed_at,
                idempotency_key=review.idempotency_key,
                due_at=state.due,
                stability=state.stability,
                difficulty=state.difficulty,
                state=state.state,
                step=state.step,
                reps=state.reps,
                lapses=state.lapses,
            )
        )
        self._s.flush()

    def find_by_idempotency_key(
        self, session_id: str, card_id: str, key: str
    ) -> tuple[Review, CardState] | None:
        row = self._s.scalar(
            select(ReviewRow).where(
                ReviewRow.session_id == session_id,
                ReviewRow.card_id == card_id,
                ReviewRow.idempotency_key == key,
            )
        )
        return (_to_review(row), _to_state(row)) if row else None

    def latest_state(self, user_id: str, card_id: str) -> CardState | None:
        row = self._s.scalar(
            select(ReviewRow)
            .where(ReviewRow.user_id == user_id, ReviewRow.card_id == card_id)
            .order_by(ReviewRow.reviewed_at.desc())
            .limit(1)
        )
        return _to_state(row) if row else None

    def due_card_ids(
        self,
        user_id: str,
        now: dt.datetime,
        *,
        sphere_id: str | None = None,
    ) -> list[str]:
        stmt = select(ReviewRow).where(ReviewRow.user_id == user_id)
        if sphere_id:
            stmt = stmt.where(ReviewRow.sphere_id == sphere_id)
        stmt = stmt.order_by(ReviewRow.reviewed_at.desc())
        latest: dict[str, ReviewRow] = {}
        for row in self._s.scalars(stmt):
            if row.card_id not in latest:
                latest[row.card_id] = row
        return [cid for cid, row in latest.items() if ensure_utc(row.due_at) <= now]

    def reviewed_card_ids(
        self,
        user_id: str,
        *,
        sphere_id: str | None = None,
    ) -> set[str]:
        stmt = select(distinct(ReviewRow.card_id)).where(ReviewRow.user_id == user_id)
        if sphere_id:
            stmt = stmt.where(ReviewRow.sphere_id == sphere_id)
        return set(self._s.scalars(stmt).all())

    def new_cards_seen_today_count(self, user_id: str, today: dt.date) -> int:
        start = dt.datetime.combine(today, dt.time.min, tzinfo=dt.UTC)
        end = start + dt.timedelta(days=1)
        stmt = select(distinct(ReviewRow.card_id)).where(
            ReviewRow.user_id == user_id,
            ReviewRow.reps == 1,
            ReviewRow.reviewed_at >= start,
            ReviewRow.reviewed_at < end,
        )
        return len(list(self._s.scalars(stmt)))

    def list_reviews(self, user_id: str) -> list[Review]:
        rows = self._s.scalars(
            select(ReviewRow).where(ReviewRow.user_id == user_id)
        ).all()
        return [_to_review(r) for r in rows]

    def list_finished_sessions(self, user_id: str) -> list[DomainSession]:
        """P7.T7.1 / ADR-027: finished-only filter for wall-clock time."""
        rows = self._s.scalars(
            select(SessionRow).where(
                SessionRow.user_id == user_id,
                SessionRow.ended_at.is_not(None),
            )
        ).all()
        return [_session_row_to_domain(r) for r in rows]


def _to_state(row: ReviewRow) -> CardState:
    return CardState(
        stability=row.stability,
        difficulty=row.difficulty,
        last_review=ensure_utc(row.reviewed_at),
        due=ensure_utc(row.due_at),
        reps=row.reps,
        lapses=row.lapses,
        state=cast(StateName, row.state),
        step=row.step,
    )


def _to_review(row: ReviewRow) -> Review:
    return Review(
        id=row.id,
        user_id=row.user_id,
        session_id=row.session_id,
        card_id=row.card_id,
        sphere_id=row.sphere_id,
        rating=Rating(row.rating),
        response_ms=row.response_ms,
        reviewed_at=ensure_utc(row.reviewed_at),
        idempotency_key=row.idempotency_key,
    )
