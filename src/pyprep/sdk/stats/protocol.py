"""Persistence protocol for StatsService.

The SQLAlchemy implementation in T2.10 will satisfy this Protocol; tests
use an in-memory fake. The Review row is the source of truth — all
aggregation is pure Python over its rows.
"""

from __future__ import annotations

from typing import Protocol

from pyprep.sdk.sessions import Review


class StatsRepository(Protocol):
    def list_reviews(self, user_id: str) -> list[Review]: ...
