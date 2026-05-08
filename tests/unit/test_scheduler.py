"""Tests for `pyprep.sdk.scheduler.FSRSScheduler` (T2.3).

The scheduler is a thin adapter over the `fsrs` library (FSRS-6 in our pin —
see NOTES N008). The adapter is the *only* place that imports `fsrs`. These
tests pin behavior at the adapter boundary, not at the algorithm level.
"""

from __future__ import annotations

import datetime as dt

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from pyprep.sdk.scheduler import CardState, FSRSScheduler, Rating

UTC = dt.timezone.utc
T0 = dt.datetime(2026, 5, 8, 12, 0, tzinfo=UTC)


def test_first_review_produces_card_state(scheduler: FSRSScheduler) -> None:
    state = scheduler.next_due(prior_state=None, rating=Rating.Good, reviewed_at=T0)

    assert isinstance(state, CardState)
    assert state.reps == 1
    assert state.lapses == 0
    assert state.last_review == T0
    assert state.due > T0
    assert state.stability > 0
    assert 1.0 <= state.difficulty <= 10.0
    assert state.state in {"learning", "review", "relearning"}


def test_first_review_again_increments_lapses(scheduler: FSRSScheduler) -> None:
    state = scheduler.next_due(prior_state=None, rating=Rating.Again, reviewed_at=T0)

    assert state.reps == 1
    assert state.lapses == 1


def test_subsequent_review_increments_reps(scheduler: FSRSScheduler) -> None:
    s1 = scheduler.next_due(prior_state=None, rating=Rating.Good, reviewed_at=T0)
    s2 = scheduler.next_due(
        prior_state=s1, rating=Rating.Good, reviewed_at=T0 + dt.timedelta(days=1)
    )

    assert s2.reps == 2
    assert s2.lapses == 0


def test_lapses_accumulate(scheduler: FSRSScheduler) -> None:
    s1 = scheduler.next_due(prior_state=None, rating=Rating.Again, reviewed_at=T0)
    s2 = scheduler.next_due(
        prior_state=s1, rating=Rating.Again, reviewed_at=T0 + dt.timedelta(minutes=10)
    )
    s3 = scheduler.next_due(
        prior_state=s2, rating=Rating.Good, reviewed_at=T0 + dt.timedelta(minutes=20)
    )

    assert (s1.lapses, s2.lapses, s3.lapses) == (1, 2, 2)


def test_naive_reviewed_at_raises(scheduler: FSRSScheduler) -> None:
    naive = dt.datetime(2026, 5, 8, 12, 0)

    with pytest.raises(ValueError, match="timezone-aware"):
        scheduler.next_due(prior_state=None, rating=Rating.Good, reviewed_at=naive)


def test_reviewed_at_must_be_at_or_after_last_review(scheduler: FSRSScheduler) -> None:
    s1 = scheduler.next_due(prior_state=None, rating=Rating.Good, reviewed_at=T0)
    earlier = T0 - dt.timedelta(seconds=1)

    with pytest.raises(ValueError, match="last_review"):
        scheduler.next_due(prior_state=s1, rating=Rating.Good, reviewed_at=earlier)


def test_review_at_exactly_last_review_does_not_raise(scheduler: FSRSScheduler) -> None:
    s1 = scheduler.next_due(prior_state=None, rating=Rating.Good, reviewed_at=T0)

    s2 = scheduler.next_due(prior_state=s1, rating=Rating.Good, reviewed_at=s1.last_review)

    assert s2.reps == 2


def test_invalid_rating_raises(scheduler: FSRSScheduler) -> None:
    with pytest.raises(ValueError, match="rating"):
        scheduler.next_due(prior_state=None, rating="GOOD", reviewed_at=T0)  # type: ignore[arg-type]


def test_determinism_same_inputs_yield_identical_state(scheduler: FSRSScheduler) -> None:
    a = scheduler.next_due(prior_state=None, rating=Rating.Good, reviewed_at=T0)
    b = scheduler.next_due(prior_state=None, rating=Rating.Good, reviewed_at=T0)

    assert a == b


def test_due_strictly_after_reviewed_at(scheduler: FSRSScheduler) -> None:
    state = scheduler.next_due(prior_state=None, rating=Rating.Easy, reviewed_at=T0)

    assert state.due > T0


def test_repeated_good_grows_stability(scheduler: FSRSScheduler) -> None:
    s = None
    when = T0
    stabilities: list[float] = []
    for _ in range(6):
        s = scheduler.next_due(prior_state=s, rating=Rating.Good, reviewed_at=when)
        stabilities.append(s.stability)
        when = s.due  # study again exactly when due
    assert stabilities == sorted(stabilities)
    assert stabilities[-1] > stabilities[0]


def test_state_eventually_graduates_to_review(scheduler: FSRSScheduler) -> None:
    s = None
    when = T0
    for _ in range(10):
        s = scheduler.next_due(prior_state=s, rating=Rating.Good, reviewed_at=when)
        when = s.due
        if s.state == "review":
            break
    assert s is not None
    assert s.state == "review"


def test_again_after_review_transitions_to_relearning(scheduler: FSRSScheduler) -> None:
    s = None
    when = T0
    for _ in range(10):
        s = scheduler.next_due(prior_state=s, rating=Rating.Good, reviewed_at=when)
        when = s.due
        if s.state == "review":
            break
    assert s is not None and s.state == "review"

    after_lapse = scheduler.next_due(prior_state=s, rating=Rating.Again, reviewed_at=when)

    assert after_lapse.state == "relearning"
    assert after_lapse.lapses == s.lapses + 1


@given(rating=st.sampled_from(list(Rating)))
@settings(max_examples=20)
def test_property_due_after_reviewed_at(scheduler: FSRSScheduler, rating: Rating) -> None:
    state = scheduler.next_due(prior_state=None, rating=rating, reviewed_at=T0)

    assert state.due > T0
    assert state.reps == 1


@pytest.fixture
def scheduler() -> FSRSScheduler:
    return FSRSScheduler()
