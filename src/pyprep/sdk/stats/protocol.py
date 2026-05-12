"""Persistence protocol for StatsService.

The SQLAlchemy implementation in T2.10 will satisfy this Protocol; tests
use an in-memory fake. The Review row is the source of truth — all
aggregation is pure Python over its rows.
"""

from __future__ import annotations

from typing import Protocol

from pyprep.sdk.sessions import Review, Session


class StatsRepository(Protocol):
    def list_reviews(self, user_id: str) -> list[Review]: ...

    # P7.T7.1 / ADR-027: returns only finished sessions (ended_at IS NOT
    # NULL). Abandoned-session filtering lives in the repo so the
    # service can sum unconditionally.
    def list_finished_sessions(self, user_id: str) -> list[Session]: ...
