"""Declarative SQLAlchemy base + tz-aware datetime helper.

SQLite stores `DateTime` as naive strings; we re-attach `dt.UTC` on the
way out to keep the domain layer tz-aware (FSRS scheduler requires it).
"""

from __future__ import annotations

import datetime as dt

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def ensure_utc(value: dt.datetime) -> dt.datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=dt.UTC)


def ensure_utc_or_none(value: dt.datetime | None) -> dt.datetime | None:
    return ensure_utc(value) if value is not None else None
