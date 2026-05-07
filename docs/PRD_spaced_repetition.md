# PRD — Spaced Repetition Scheduler (FSRS)

**Component:** `src/pyprep/sdk/scheduler/`
**Authority:** This PRD is the single source of truth for spaced-repetition behavior. Diverging implementations must update this document first.

---

## 1. Background & Theory

Spaced repetition is the practice of reviewing material at increasing intervals to maximize long-term retention with minimum study time. Two canonical algorithms exist:

- **SM-2 (1987)** — used by classic Anki. Simple, deterministic, well-understood. Tunable by hand.
- **FSRS (Free Spaced Repetition Scheduler, 2022+)** — modern, fits a memory model with three parameters per card: **stability** (how fast memory decays), **difficulty** (intrinsic hardness), and **retrievability** (probability of recall right now). Trained on millions of real reviews.

PyPrep uses **FSRS** (see `PLAN.md` ADR-002).

The FSRS model:
- After each rating, `stability` is updated based on the previous stability, the rating (1–4), and the time since last review.
- Next review is scheduled to occur when `retrievability` decays to a target (default `0.9` — i.e. when there is a 10% chance of forgetting).

Library: [`py-fsrs`](https://github.com/open-spaced-repetition/py-fsrs).

---

## 2. Requirements

### 2.1 Inputs

For each review event, the scheduler receives:

| Field | Type | Notes |
|---|---|---|
| `card_id` | `str` | Logical card ID (e.g. `m1-s0-c1`) |
| `prior_state` | `CardState \| None` | Previous FSRS state; `None` for first-ever review |
| `rating` | `Rating` enum | `AGAIN=1`, `HARD=2`, `GOOD=3`, `EASY=4` |
| `reviewed_at` | `datetime` | UTC, the exact moment the user submitted |

### 2.2 Outputs

```python
class CardState:
    stability: float          # days
    difficulty: float         # 1..10
    last_review: datetime     # UTC
    due: datetime             # UTC, next review time
    reps: int                 # cumulative review count
    lapses: int               # cumulative AGAIN count
    state: Literal["new", "learning", "review", "relearning"]
```

The scheduler is a pure function: `(prior_state, rating, reviewed_at) -> new_state`. No side effects. Persistence is the caller's responsibility.

### 2.3 Setup / Configuration

Configurable via `Settings`:

| Param | Default | Effect |
|---|---|---|
| `request_retention` | `0.9` | Target retrievability at next review |
| `maximum_interval` | `36500` (days, ~100 years) | Cap |
| `weights` | FSRS-5 default | The 17 model weights |
| `learning_steps` | `[1m, 10m]` | Steps for "new" cards before graduation |
| `relearning_steps` | `[10m]` | Steps after a lapse |

All values are read once from settings; the scheduler is instantiated per-request and is otherwise stateless.

### 2.4 Performance

- p95 latency for a single `next_due` call: **≤ 1 ms**.
- The function does no I/O.

### 2.5 Determinism

Given the same inputs, output **MUST** be byte-identical. Tested via golden vectors (see §4).

---

## 3. Public Interface

```python
# src/pyprep/sdk/scheduler/__init__.py

from .fsrs_scheduler import FSRSScheduler, CardState, Rating

__all__ = ["FSRSScheduler", "CardState", "Rating"]
```

```python
# Usage from SessionService:

scheduler = FSRSScheduler(settings.fsrs)
new_state = scheduler.next_due(
    prior_state=existing_state,   # or None
    rating=Rating.GOOD,
    reviewed_at=datetime.now(tz=UTC),
)
# persist new_state via repo
```

The class wraps `py-fsrs` to keep `py-fsrs` as the only file that imports the library — swappable later if needed (see Building Block design, Segal §15).

---

## 4. Test Strategy

### 4.1 Unit Tests

- Golden vectors imported from `py-fsrs` reference tests.
- Edge cases:
  - First-ever review (`prior_state=None`) → state transitions to `learning` then `review` per learning_steps.
  - All `AGAIN` ratings → `stability` decreases, `lapses` increments, state moves through `relearning`.
  - All `EASY` ratings → `stability` grows, `due` extends.
  - `reviewed_at` exactly equal to `prior_state.due` → no penalty.
  - `reviewed_at` significantly past due → no extra penalty (FSRS handles this gracefully).
- Property tests (`hypothesis`):
  - `next_due(...).due > reviewed_at` always.
  - `next_due(...).reps == prior_state.reps + 1` always.
  - Repeated `GOOD` ratings produce monotonically increasing `stability`.

### 4.2 Coverage Target

≥ **95%** on `src/pyprep/sdk/scheduler/` (above the project-wide 85% gate).

### 4.3 Snapshot Tests

A 20-step canonical review history is replayed; the resulting state at each step is compared against a JSON snapshot. Any change in algorithm output is loud.

---

## 5. Building-Block Spec (Segal §15)

```
Input:  prior_state (CardState | None), rating (Rating), reviewed_at (datetime UTC)
Output: new_state (CardState)
Setup:  request_retention (0.0..1.0), maximum_interval (int days), weights (list[float]),
        learning_steps (list[timedelta]), relearning_steps (list[timedelta])
```

### 5.1 Validation

- `rating` MUST be one of the four enum values; raise `ValueError` otherwise.
- `reviewed_at` MUST be timezone-aware UTC; raise `ValueError` otherwise.
- If `prior_state` is provided, `reviewed_at >= prior_state.last_review`; raise `ValueError` otherwise.

---

## 6. Alternatives Considered

| Alternative | Why rejected |
|---|---|
| SM-2 | Less accurate per published benchmarks; modern Anki has switched to FSRS |
| Build our own ML model | Out of scope; we are not a research project |
| Static fixed intervals (1d, 3d, 7d, 14d, 30d) | Naive; ignores per-card difficulty signals |
| Leitner box system | Too coarse for the granularity we want |

---

## 7. Acceptance Criteria

- [ ] `FSRSScheduler.next_due` is pure, deterministic, ≤ 1 ms.
- [ ] Wraps `py-fsrs`; the library is imported in exactly one file.
- [ ] All golden vectors pass.
- [ ] Property tests pass.
- [ ] Coverage ≥ 95%.
- [ ] No file in `src/pyprep/sdk/scheduler/` exceeds 150 LOC.
- [ ] Public interface documented in this PRD matches the implementation.
