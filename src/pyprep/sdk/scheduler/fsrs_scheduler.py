"""FSRSScheduler — thin adapter over `fsrs` (FSRS-6); only file importing fsrs.

Public surface: `FSRSScheduler.next_due(prior_state, rating, reviewed_at)
-> CardState`. The function is pure and deterministic — fuzzing in the
underlying library is disabled (PRD §2.5).
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Literal

import fsrs

Rating = fsrs.Rating

StateName = Literal["new", "learning", "review", "relearning"]

_STATE_TO_NAME: dict[fsrs.State, StateName] = {
    fsrs.State.Learning: "learning",
    fsrs.State.Review: "review",
    fsrs.State.Relearning: "relearning",
}
_NAME_TO_STATE: dict[StateName, fsrs.State] = {
    "learning": fsrs.State.Learning,
    "review": fsrs.State.Review,
    "relearning": fsrs.State.Relearning,
}


@dataclass(frozen=True, slots=True)
class CardState:
    stability: float
    difficulty: float
    last_review: dt.datetime
    due: dt.datetime
    reps: int
    lapses: int
    state: StateName
    step: int = 0  # FSRS learning/relearning step index — see NOTES N009


class FSRSScheduler:
    def __init__(
        self,
        *,
        desired_retention: float = 0.9,
        maximum_interval: int = 36500,
    ) -> None:
        self._scheduler = fsrs.Scheduler(
            desired_retention=desired_retention,
            maximum_interval=maximum_interval,
            enable_fuzzing=False,
        )

    def next_due(
        self,
        prior_state: CardState | None,
        rating: Rating,
        reviewed_at: dt.datetime,
    ) -> CardState:
        _validate(prior_state, rating, reviewed_at)
        card_in = _to_fsrs_card(prior_state)
        card_out, _log = self._scheduler.review_card(card_in, rating, reviewed_at)
        return _from_fsrs_card(card_out, prior_state, rating)


def _validate(
    prior_state: CardState | None,
    rating: Rating,
    reviewed_at: dt.datetime,
) -> None:
    if not isinstance(rating, Rating):
        raise ValueError(f"rating must be Rating enum, got {type(rating).__name__}")
    if reviewed_at.tzinfo is None or reviewed_at.utcoffset() is None:
        raise ValueError("reviewed_at must be timezone-aware")
    if prior_state is not None and reviewed_at < prior_state.last_review:
        raise ValueError(
            f"reviewed_at {reviewed_at.isoformat()} is before "
            f"prior_state.last_review {prior_state.last_review.isoformat()}"
        )


def _to_fsrs_card(prior: CardState | None) -> fsrs.Card:
    if prior is None:
        return fsrs.Card()
    return fsrs.Card(
        state=_NAME_TO_STATE[prior.state],
        step=prior.step,
        stability=prior.stability,
        difficulty=prior.difficulty,
        due=prior.due,
        last_review=prior.last_review,
    )


def _from_fsrs_card(
    card: fsrs.Card,
    prior: CardState | None,
    rating: Rating,
) -> CardState:
    base_reps = prior.reps if prior else 0
    base_lapses = prior.lapses if prior else 0
    return CardState(
        stability=card.stability or 0.0,
        difficulty=card.difficulty or 0.0,
        last_review=card.last_review,  # type: ignore[arg-type]
        due=card.due,
        reps=base_reps + 1,
        lapses=base_lapses + (1 if rating is Rating.Again else 0),
        state=_STATE_TO_NAME[card.state],
        step=card.step or 0,
    )
