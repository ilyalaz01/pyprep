# PRD — Progress Tracking & Weakness Detection

**Component:** `src/pyprep/sdk/stats/`

---

## 1. Background

A learner needs honest, *useful* stats — not Duolingo-style vanity numbers. The single most actionable signal is "where am I weakest?" — the platform should answer that in one widget.

---

## 2. Definitions

- **Retention rate (per scope)** = `correct_reviews / total_reviews` where a review counts "correct" if the rating was `GOOD` or `EASY`.
- **Volume (per scope)** = `total_reviews` for that scope.
- **Weakness score (per sphere)** = `(1 - retention) * log(1 + volume)`.
  - Punishes low retention but only on spheres the user has actually exercised.
  - A sphere with 1 review and 0% retention is **not** ranked above a sphere with 50 reviews and 60% retention.
- **Streak** = consecutive UTC-days with at least one review.

---

## 3. Requirements

### 3.1 Functional

- **FR-STATS-1:** Compute per-card, per-task, per-sphere, per-module, per-tag retention and volume.
- **FR-STATS-2:** "Weakness top 3" — return the 3 spheres with highest weakness score, restricted to spheres with ≥ 5 reviews.
- **FR-STATS-3:** Daily stats: cards reviewed today, time spent, accuracy.
- **FR-STATS-4:** 30-day rolling chart: per-day reviewed-count and retention.
- **FR-STATS-5:** Streak counter; gracefully handles user timezone vs UTC.
- **FR-STATS-6:** XP per review = `difficulty * outcome_multiplier`, where `EASY=1.0, GOOD=1.0, HARD=1.5, AGAIN=0` (lapses earn no XP, but no negative XP either — anti-shame).

### 3.2 Behavior

- **No streak shaming.** If streak breaks, UI says "Welcome back" — no flame extinction animation, no apology demand.
- **Honest weakness display.** If user is bad at something, app says so neutrally and links to "Practice now".

### 3.3 Performance

- p95 stats fetch ≤ 50 ms for typical user (≤ 5000 reviews).
- Stats are computed on-the-fly from the `reviews` table at MVP. Materialized views deferred to post-MVP.

---

## 4. Public Interface

```python
# src/pyprep/sdk/stats/__init__.py

class StatsService:
    def __init__(self, review_repo: ReviewRepository): ...

    def overview(self, user_id: str) -> Overview:
        """Total reviews, retention, streak, XP."""

    def per_module(self, user_id: str) -> list[ModuleStats]:
        """Reviews & retention per module."""

    def per_sphere(self, user_id: str) -> list[SphereStats]: ...

    def weakness_top_n(self, user_id: str, n: int = 3) -> list[SphereStats]:
        """Spheres ranked by weakness score; only spheres with >= 5 reviews."""

    def daily_chart(self, user_id: str, days: int = 30) -> list[DailyStat]: ...

    def streak(self, user_id: str, user_tz: str = "UTC") -> int: ...
```

---

## 5. Test Strategy

- Synthesize review history fixtures (helper in `tests/factories.py`).
- Snapshot tests for `overview` against fixed histories.
- Property tests: weakness ranking is stable when adding more `EASY` reviews to one sphere.
- Edge cases: user with zero reviews, user with reviews on a single sphere, user with reviews spanning timezones.

---

## 6. Acceptance Criteria

- [ ] All public methods documented with examples.
- [ ] ≥ 90% coverage on `stats/`.
- [ ] No file > 150 LOC.
- [ ] Numbers in the UI match values returned by the service for sampled fixtures.
- [ ] Streak handles DST transitions correctly (test fixture forces America/New_York DST).
