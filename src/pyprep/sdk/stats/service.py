"""StatsService — pure-Python aggregation over Review rows.

Spec: `docs/PRD_progress_tracking.md`. Performance contract is p95 ≤ 50 ms
for ≤ 5000 reviews; Python aggregation over that volume is sub-ms.
"""

from __future__ import annotations

import datetime as dt
import math
from collections import defaultdict
from collections.abc import Callable
from zoneinfo import ZoneInfo

from pyprep.sdk.cards import CardNotFoundError, CardService
from pyprep.sdk.scheduler import Rating
from pyprep.sdk.sessions import Review

from .models import DailyStat, ModuleStats, Overview, SphereStats
from .protocol import StatsRepository

_CORRECT = {Rating.Good, Rating.Easy}
_WEAKNESS_MIN_REVIEWS = 5
_XP_MULT: dict[Rating, float] = {
    Rating.Again: 0.0,
    Rating.Hard: 1.5,
    Rating.Good: 1.0,
    Rating.Easy: 1.0,
}


def _now_utc() -> dt.datetime:
    return dt.datetime.now(dt.UTC)


class StatsService:
    def __init__(
        self,
        reviews: StatsRepository,
        cards: CardService,
        *,
        clock: Callable[[], dt.datetime] = _now_utc,
    ) -> None:
        self._reviews = reviews
        self._cards = cards
        self._clock = clock

    def overview(self, user_id: str) -> Overview:
        rows = self._reviews.list_reviews(user_id)
        xp = 0.0
        orphans = 0
        for r in rows:
            difficulty = self._card_difficulty(r.card_id)
            if difficulty is None:
                orphans += 1
                continue
            xp += difficulty * _XP_MULT[r.rating]
        return Overview(
            reviews_total=len(rows),
            retention=_retention(rows),
            streak=self.streak(user_id),
            xp=xp,
            orphan_review_count=orphans,
        )

    def per_module(self, user_id: str) -> list[ModuleStats]:
        groups: dict[int, list[Review]] = defaultdict(list)
        for r in self._reviews.list_reviews(user_id):
            module_id = self._module_of(r.sphere_id)
            if module_id is None:
                continue  # orphan — can't bucket without a live module
            groups[module_id].append(r)
        return [
            ModuleStats(module_id=m, reviews_total=len(g), retention=_retention(g))
            for m, g in groups.items()
        ]

    def per_sphere(self, user_id: str) -> list[SphereStats]:
        groups: dict[str, list[Review]] = defaultdict(list)
        for r in self._reviews.list_reviews(user_id):
            groups[r.sphere_id].append(r)
        out: list[SphereStats] = []
        for sid, g in groups.items():
            ret = _retention(g)
            out.append(
                SphereStats(
                    sphere_id=sid,
                    reviews_total=len(g),
                    retention=ret,
                    weakness=(1 - ret) * math.log1p(len(g)),
                )
            )
        return out

    def weakness_top_n(self, user_id: str, n: int = 3) -> list[SphereStats]:
        eligible = [
            s for s in self.per_sphere(user_id) if s.reviews_total >= _WEAKNESS_MIN_REVIEWS
        ]
        eligible.sort(key=lambda s: s.weakness, reverse=True)
        return eligible[:n]

    def daily_chart(
        self,
        user_id: str,
        days: int = 30,
        *,
        today: dt.datetime | None = None,
    ) -> list[DailyStat]:
        end = (today or self._clock()).astimezone(dt.UTC).date()
        start = end - dt.timedelta(days=days - 1)
        groups: dict[dt.date, list[Review]] = defaultdict(list)
        for r in self._reviews.list_reviews(user_id):
            d = r.reviewed_at.astimezone(dt.UTC).date()
            if start <= d <= end:
                groups[d].append(r)
        return [
            DailyStat(
                date=start + dt.timedelta(days=i),
                reviews_total=len(groups.get(start + dt.timedelta(days=i), [])),
                retention=_retention(groups.get(start + dt.timedelta(days=i), [])),
            )
            for i in range(days)
        ]

    def streak(
        self,
        user_id: str,
        user_tz: str = "UTC",
        *,
        today: dt.datetime | None = None,
    ) -> int:
        tz = ZoneInfo(user_tz)
        anchor = (today or self._clock()).astimezone(tz).date()
        days_with_reviews = {
            r.reviewed_at.astimezone(tz).date()
            for r in self._reviews.list_reviews(user_id)
        }
        count = 0
        d = anchor
        while d in days_with_reviews:
            count += 1
            d -= dt.timedelta(days=1)
        return count

    def _module_of(self, sphere_id: str) -> int | None:
        """Return module_id for a sphere, or None if the sphere is no longer
        in the live content index (orphan review). T2.5.3."""
        cards = self._cards.by_sphere(sphere_id)
        return cards[0].module_id if cards else None

    def _card_difficulty(self, card_id: str) -> int | None:
        try:
            return self._cards.get(card_id).difficulty
        except CardNotFoundError:
            return None


def _retention(rows: list[Review]) -> float:
    if not rows:
        return 0.0
    correct = sum(1 for r in rows if r.rating in _CORRECT)
    return correct / len(rows)
