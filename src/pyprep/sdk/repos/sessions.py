"""SessionRepository — SQLAlchemy impl of the SessionStore Protocol."""

from __future__ import annotations

from typing import cast

from sqlalchemy import update
from sqlalchemy.orm import Session

from pyprep.sdk.sessions import Session as DomainSession
from pyprep.sdk.sessions import SessionMode

from .database import ensure_utc, ensure_utc_or_none
from .models import SessionRow


class SessionRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def create(self, dom: DomainSession) -> None:
        self._s.add(_to_row(dom))
        self._s.flush()

    def get(self, session_id: str) -> DomainSession:
        row = self._s.get(SessionRow, session_id)
        if row is None:
            raise KeyError(session_id)
        return _to_domain(row)

    def update(self, dom: DomainSession) -> None:
        row = self._s.get(SessionRow, dom.id)
        if row is None:
            raise KeyError(dom.id)
        row.mode = dom.mode
        row.started_at = dom.started_at
        row.ended_at = dom.ended_at
        row.queue = list(dom.queue)
        row.cards_total = dom.cards_total
        row.cards_correct = dom.cards_correct
        self._s.flush()

    def increment_cards_correct(self, session_id: str) -> None:
        """Atomic UPDATE — race-safe across concurrent submits."""
        self._s.execute(
            update(SessionRow)
            .where(SessionRow.id == session_id)
            .values(cards_correct=SessionRow.cards_correct + 1)
        )
        self._s.flush()


def _to_row(dom: DomainSession) -> SessionRow:
    return SessionRow(
        id=dom.id,
        user_id=dom.user_id,
        mode=dom.mode,
        started_at=dom.started_at,
        ended_at=dom.ended_at,
        queue=list(dom.queue),
        cards_total=dom.cards_total,
        cards_correct=dom.cards_correct,
    )


def _to_domain(row: SessionRow) -> DomainSession:
    return DomainSession(
        id=row.id,
        user_id=row.user_id,
        mode=cast(SessionMode, row.mode),
        started_at=ensure_utc(row.started_at),
        ended_at=ensure_utc_or_none(row.ended_at),
        queue=tuple(row.queue),
        cards_total=row.cards_total,
        cards_correct=row.cards_correct,
    )
