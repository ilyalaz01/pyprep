"""/api/stats — overview + weakness top-N + per-module + 30-day chart.

Auth-gated, per-user. T7.2 added the per-module and daily endpoints as
thin wrappers over StatsService methods that have existed since Phase 2.
"""

from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from pyprep.api.deps import get_content_index, get_current_user, get_stats_service
from pyprep.sdk.auth import User
from pyprep.sdk.content_loader import ContentIndex
from pyprep.sdk.stats import DailyStat, ModuleStats, StatsService

router = APIRouter(prefix="/stats", tags=["stats"])


class OverviewResponse(BaseModel):
    reviews_total: int
    retention: float
    streak: int
    xp: float
    orphan_review_count: int
    # P7.T7.1 / ADR-027: wall-clock session time, integer seconds.
    total_seconds: int


class SphereStatsResponse(BaseModel):
    sphere_id: str
    reviews_total: int
    retention: float
    weakness: float
    # T4.5.6: human label from lesson frontmatter; null if no lesson/title.
    lesson_title: str | None = None


class WeaknessResponse(BaseModel):
    top: list[SphereStatsResponse]


class ModuleStatsResponse(BaseModel):
    module_id: int
    reviews_total: int
    retention: float


class PerModuleResponse(BaseModel):
    modules: list[ModuleStatsResponse]


class DailyStatResponse(BaseModel):
    date: dt.date
    reviews_total: int
    retention: float


class DailyResponse(BaseModel):
    days: list[DailyStatResponse]


@router.get("/me", response_model=OverviewResponse)
def get_overview(
    user: User = Depends(get_current_user),
    stats: StatsService = Depends(get_stats_service),
) -> OverviewResponse:
    o = stats.overview(user.id)
    return OverviewResponse(
        reviews_total=o.reviews_total,
        retention=o.retention,
        streak=o.streak,
        xp=o.xp,
        orphan_review_count=o.orphan_review_count,
        total_seconds=o.total_seconds,
    )


@router.get("/me/weakness", response_model=WeaknessResponse)
def get_weakness(
    n: int = Query(default=3, ge=1, le=20),
    user: User = Depends(get_current_user),
    stats: StatsService = Depends(get_stats_service),
    index: ContentIndex = Depends(get_content_index),
) -> WeaknessResponse:
    rows = stats.weakness_top_n(user.id, n=n)
    return WeaknessResponse(top=[_to_sphere(s, index) for s in rows])


def _to_sphere(s, index: ContentIndex) -> SphereStatsResponse:  # type: ignore[no-untyped-def]
    sphere = index.spheres.get(s.sphere_id)
    title = sphere.lesson_meta.title if sphere and sphere.lesson_meta else None
    return SphereStatsResponse(
        sphere_id=s.sphere_id,
        reviews_total=s.reviews_total,
        retention=s.retention,
        weakness=s.weakness,
        lesson_title=title,
    )


@router.get("/me/per-module", response_model=PerModuleResponse)
def get_per_module(
    user: User = Depends(get_current_user),
    stats: StatsService = Depends(get_stats_service),
) -> PerModuleResponse:
    rows = stats.per_module(user.id)
    return PerModuleResponse(modules=[_to_module(m) for m in rows])


# P7.T7.2: 90-day ceiling on `days` is the practical upper bound — UI
# renders a 30-day chart by default; broader windows are a power-user
# affordance, not a primary surface. Tighten or extend without an ADR.
@router.get("/me/daily", response_model=DailyResponse)
def get_daily(
    days: int = Query(default=30, ge=1, le=90),
    user: User = Depends(get_current_user),
    stats: StatsService = Depends(get_stats_service),
) -> DailyResponse:
    rows = stats.daily_chart(user.id, days=days)
    return DailyResponse(days=[_to_daily(d) for d in rows])


def _to_module(m: ModuleStats) -> ModuleStatsResponse:
    return ModuleStatsResponse(
        module_id=m.module_id,
        reviews_total=m.reviews_total,
        retention=m.retention,
    )


def _to_daily(d: DailyStat) -> DailyStatResponse:
    return DailyStatResponse(
        date=d.date,
        reviews_total=d.reviews_total,
        retention=d.retention,
    )
