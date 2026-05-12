"""Stats result types — frozen dataclasses, no behavior."""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Overview:
    reviews_total: int
    retention: float
    streak: int
    xp: float
    orphan_review_count: int = 0
    # P7.T7.1 / ADR-027: sum of (ended_at - started_at) across finished
    # sessions only. Abandoned sessions excluded by the repo. Integer
    # seconds — UI renders as "Xh Ym" or "Mm Ss".
    total_seconds: int = 0


@dataclass(frozen=True, slots=True)
class ModuleStats:
    module_id: int
    reviews_total: int
    retention: float


@dataclass(frozen=True, slots=True)
class SphereStats:
    sphere_id: str
    reviews_total: int
    retention: float
    weakness: float


@dataclass(frozen=True, slots=True)
class DailyStat:
    date: dt.date
    reviews_total: int
    retention: float
