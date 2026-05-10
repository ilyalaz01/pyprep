"""/api/stats — overview + weakness top-N. Auth-gated, per-user."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from pyprep.api.deps import get_content_index, get_current_user, get_stats_service
from pyprep.sdk.auth import User
from pyprep.sdk.content_loader import ContentIndex
from pyprep.sdk.stats import StatsService

router = APIRouter(prefix="/stats", tags=["stats"])


class OverviewResponse(BaseModel):
    reviews_total: int
    retention: float
    streak: int
    xp: float
    orphan_review_count: int


class SphereStatsResponse(BaseModel):
    sphere_id: str
    reviews_total: int
    retention: float
    weakness: float
    # T4.5.6: human label from lesson frontmatter; null if no lesson/title.
    lesson_title: str | None = None


class WeaknessResponse(BaseModel):
    top: list[SphereStatsResponse]


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
