"""Session/Review/Result data classes and the SessionFinishedError."""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Literal

from pyprep.sdk.scheduler import CardState, Rating

SessionMode = Literal["learn", "review", "mixed"]


@dataclass(frozen=True, slots=True)
class Session:
    id: str
    user_id: str
    mode: SessionMode
    started_at: dt.datetime
    ended_at: dt.datetime | None
    queue: tuple[str, ...]
    cards_total: int
    cards_correct: int


@dataclass(frozen=True, slots=True)
class Review:
    id: str
    user_id: str
    session_id: str
    card_id: str
    sphere_id: str
    rating: Rating
    response_ms: int
    reviewed_at: dt.datetime


@dataclass(frozen=True, slots=True)
class SubmitResult:
    next_state: CardState


@dataclass(frozen=True, slots=True)
class SessionSummary:
    cards_total: int
    cards_correct: int
    retention: float


class SessionFinishedError(Exception):
    """Raised when submitting against a session that is already finished."""
