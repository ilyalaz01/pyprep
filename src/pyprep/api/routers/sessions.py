"""/api/sessions/* — start, next, answer, finish.

idempotency_key contract pinned in NOTES N021.1: body-only field, optional,
no server fallback. Cross-user access returns 404, not 403 (N021.3).
`/finish` is idempotent (N022) — second call returns the same body.
"""

from __future__ import annotations

import datetime as dt
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, model_validator

from pyprep.api.deps import (
    get_card_service,
    get_current_user,
    get_session_service,
    get_session_store,
    get_settings,
)
from pyprep.sdk.auth import User
from pyprep.sdk.cards import CardService
from pyprep.sdk.repos.sessions import SessionRepository
from pyprep.sdk.scheduler import Rating
from pyprep.sdk.sessions import Session as DomainSession
from pyprep.sdk.sessions import SessionService
from pyprep.sdk.shared.config import Settings

router = APIRouter(prefix="/sessions", tags=["sessions"])

_KEY_PATTERN = r"^[A-Za-z0-9_-]+$"


class StartRequest(BaseModel):
    mode: Literal["learn", "review", "mixed"]
    sphere_id: str | None = None
    limit: int = Field(default=20, ge=1, le=100)

    @model_validator(mode="after")
    def _check_sphere_required(self) -> StartRequest:
        if self.mode in ("learn", "mixed") and self.sphere_id is None:
            raise ValueError(f"sphere_id is required for mode={self.mode!r}")
        return self


class SessionResponse(BaseModel):
    id: str
    user_id: str
    mode: str
    queue: list[str]
    started_at: dt.datetime
    ended_at: dt.datetime | None
    cards_total: int
    cards_correct: int


class NextCardResponse(BaseModel):
    card_id: str
    type: str
    topic: str
    difficulty: int
    sphere_id: str
    raw: dict[str, Any]


class AnswerRequest(BaseModel):
    card_id: str
    rating: int = Field(ge=1, le=4)
    response_ms: int = Field(ge=0)
    idempotency_key: str | None = Field(
        default=None, min_length=16, max_length=128, pattern=_KEY_PATTERN
    )


class AnswerResponse(BaseModel):
    next_due_at: dt.datetime
    new_state: str


class FinishResponse(BaseModel):
    cards_total: int
    cards_correct: int
    retention: float


def _owned_session(
    session_id: str, user: User, store: SessionRepository
) -> DomainSession:
    """Fetch session and enforce ownership. Cross-user access → 404 (N021.3)."""
    try:
        s = store.get(session_id)
    except KeyError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND) from e
    if s.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return s


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SessionResponse)
def start(
    body: StartRequest,
    user: User = Depends(get_current_user),
    sessions: SessionService = Depends(get_session_service),
    settings: Settings = Depends(get_settings),
) -> SessionResponse:
    s = sessions.start(
        user_id=user.id,
        mode=body.mode,
        sphere_id=body.sphere_id,
        limit=body.limit,
        daily_new_card_cap=settings.daily_new_card_cap,
    )
    return _to_session_response(s)


@router.get("/{session_id}/next", response_model=NextCardResponse)
def next_card(
    session_id: str,
    after: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    store: SessionRepository = Depends(get_session_store),
    cards: CardService = Depends(get_card_service),
) -> NextCardResponse:
    s = _owned_session(session_id, user, store)
    queue = list(s.queue)
    idx = (queue.index(after) + 1) if after is not None else 0
    if idx >= len(queue):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="no more cards in queue")
    c = cards.get(queue[idx])
    return NextCardResponse(
        card_id=c.id, type=c.type, topic=c.topic, difficulty=c.difficulty,
        sphere_id=c.sphere_id, raw=c.raw,
    )


@router.post("/{session_id}/answer", response_model=AnswerResponse)
def answer(
    session_id: str,
    body: AnswerRequest,
    user: User = Depends(get_current_user),
    store: SessionRepository = Depends(get_session_store),
    sessions: SessionService = Depends(get_session_service),
) -> AnswerResponse:
    _owned_session(session_id, user, store)
    result = sessions.submit(
        session_id=session_id, card_id=body.card_id, rating=Rating(body.rating),
        response_ms=body.response_ms, idempotency_key=body.idempotency_key,
    )
    return AnswerResponse(next_due_at=result.next_state.due, new_state=result.next_state.state)


@router.post("/{session_id}/finish", response_model=FinishResponse)
def finish(
    session_id: str,
    user: User = Depends(get_current_user),
    store: SessionRepository = Depends(get_session_store),
    sessions: SessionService = Depends(get_session_service),
) -> FinishResponse:
    _owned_session(session_id, user, store)
    summary = sessions.finish(session_id)
    return FinishResponse(
        cards_total=summary.cards_total, cards_correct=summary.cards_correct,
        retention=summary.retention,
    )


def _to_session_response(s: DomainSession) -> SessionResponse:
    return SessionResponse(
        id=s.id, user_id=s.user_id, mode=s.mode, queue=list(s.queue),
        started_at=s.started_at, ended_at=s.ended_at,
        cards_total=s.cards_total, cards_correct=s.cards_correct,
    )
