"""Persistence protocols for SessionService.

The SDK depends on these abstractions, not on SQLAlchemy. The repos in
T2.10 will provide concrete implementations.
"""

from __future__ import annotations

import datetime as dt
from typing import Protocol

from pyprep.sdk.scheduler import CardState

from .models import Review, Session


class SessionStore(Protocol):
    def create(self, session: Session) -> None: ...
    def get(self, session_id: str) -> Session: ...
    def update(self, session: Session) -> None: ...
    def increment_cards_correct(self, session_id: str) -> None: ...


class ReviewStore(Protocol):
    def latest_state(self, user_id: str, card_id: str) -> CardState | None: ...
    def add(self, review: Review, state: CardState) -> None: ...
    def find_by_idempotency_key(
        self, session_id: str, card_id: str, key: str
    ) -> tuple[Review, CardState] | None: ...
    def due_card_ids(
        self,
        user_id: str,
        now: dt.datetime,
        *,
        sphere_id: str | None = None,
    ) -> list[str]: ...
    def reviewed_card_ids(
        self,
        user_id: str,
        *,
        sphere_id: str | None = None,
    ) -> set[str]: ...
    def new_cards_seen_today_count(self, user_id: str, today: dt.date) -> int: ...
