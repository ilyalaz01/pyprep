"""SQLAlchemy ORM rows.

Schema notes for the T2.10 review:
- `users.email` is `unique=True` AND `index=True` — DB-level UNIQUE
  constraint; check-then-create races are not possible.
- `reviews` has a composite index on `(user_id, due_at)` so the review-
  queue query (latest-per-card filtered by due_at) does not table-scan
  on Postgres / SQLite.
- A second composite `(user_id, card_id, reviewed_at)` index supports
  `latest_state` lookups efficiently.
- FSRS state (stability, difficulty, due, state, step, reps, lapses)
  is denormalized onto each Review row. The latest review per
  (user_id, card_id) IS the current `CardState`. No separate state
  table — keeps `add()` a single insert and avoids two-table updates.
- FKs use `ON DELETE CASCADE` for user-rooted aggregates (PLAN §5).
  Deleting a user wipes their sessions and reviews — the GDPR-aligned
  default. Note: SQLite enforces FKs only when `PRAGMA foreign_keys=ON`
  is set per-connection; the metadata is correct, enforcement is the
  caller's responsibility.
"""

from __future__ import annotations

import datetime as dt

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class UserRow(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    is_single_user: Mapped[bool] = mapped_column(default=False)


class SessionRow(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    mode: Mapped[str] = mapped_column(String)
    started_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    queue: Mapped[list[str]] = mapped_column(JSON, default=list)
    cards_total: Mapped[int] = mapped_column(Integer)
    cards_correct: Mapped[int] = mapped_column(Integer)


class ReviewRow(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE")
    )
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("sessions.id", ondelete="CASCADE")
    )
    card_id: Mapped[str] = mapped_column(String)
    sphere_id: Mapped[str] = mapped_column(String, index=True)
    rating: Mapped[int] = mapped_column(Integer)
    response_ms: Mapped[int] = mapped_column(Integer)
    reviewed_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))

    # FSRS post-review state (the latest row per (user_id, card_id) IS
    # the current CardState — see module docstring):
    due_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    stability: Mapped[float] = mapped_column(Float)
    difficulty: Mapped[float] = mapped_column(Float)
    state: Mapped[str] = mapped_column(String)
    step: Mapped[int] = mapped_column(Integer)
    reps: Mapped[int] = mapped_column(Integer)
    lapses: Mapped[int] = mapped_column(Integer)

    __table_args__ = (
        Index("ix_reviews_user_due", "user_id", "due_at"),
        Index("ix_reviews_user_card_reviewed", "user_id", "card_id", "reviewed_at"),
    )
