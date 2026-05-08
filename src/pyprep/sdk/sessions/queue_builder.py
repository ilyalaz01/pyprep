"""Queue assembly for SessionService — pure logic, no orchestration.

Extracted from `service.py` so the orchestrator stays under the 150-LOC
ceiling and the queue rules can evolve independently. The builder
takes the same `CardService` and `ReviewStore` as the service, plus
the request parameters; it returns a tuple of card_ids.
"""

from __future__ import annotations

import datetime as dt

from pyprep.sdk.cards import CardService

from .models import SessionMode
from .protocols import ReviewStore


def build_queue(
    *,
    cards: CardService,
    reviews: ReviewStore,
    user_id: str,
    mode: SessionMode,
    sphere_id: str | None,
    limit: int,
    daily_new_card_cap: int,
    now: dt.datetime,
) -> tuple[str, ...]:
    if mode == "learn":
        if sphere_id is None:
            raise ValueError("learn mode requires sphere_id")
        return tuple(_new_in_sphere(cards, reviews, user_id, sphere_id)[:limit])
    if mode == "review":
        ids = reviews.due_card_ids(user_id, now, sphere_id=sphere_id)
        return tuple(ids[:limit])
    if mode == "mixed":
        if sphere_id is None:
            raise ValueError("mixed mode requires sphere_id")
        return _mixed_queue(
            cards, reviews, user_id, sphere_id, limit, daily_new_card_cap, now
        )
    raise ValueError(f"unsupported session mode: {mode}")


def _new_in_sphere(
    cards: CardService,
    reviews: ReviewStore,
    user_id: str,
    sphere_id: str,
) -> list[str]:
    seen = reviews.reviewed_card_ids(user_id, sphere_id=sphere_id)
    return [c.id for c in cards.by_sphere(sphere_id) if c.id not in seen]


def _mixed_queue(
    cards: CardService,
    reviews: ReviewStore,
    user_id: str,
    sphere_id: str,
    limit: int,
    daily_new_card_cap: int,
    now: dt.datetime,
) -> tuple[str, ...]:
    new_today = reviews.new_cards_seen_today_count(user_id, now.date())
    new_remaining = max(0, daily_new_card_cap - new_today)
    new_pool = _new_in_sphere(cards, reviews, user_id, sphere_id)
    due_pool = reviews.due_card_ids(user_id, now, sphere_id=sphere_id)
    new_take = min(limit // 2, len(new_pool), new_remaining)
    due_take = min(limit - new_take, len(due_pool))
    remaining = limit - new_take - due_take
    if remaining and len(new_pool) > new_take and new_remaining > new_take:
        extra = min(remaining, len(new_pool) - new_take, new_remaining - new_take)
        new_take += extra
    return tuple(due_pool[:due_take] + new_pool[:new_take])
