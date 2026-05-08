"""UserRepository — SQLAlchemy impl of the AuthService UserStore Protocol."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from pyprep.sdk.auth import EmailAlreadyExistsError, User

from .database import ensure_utc
from .models import UserRow


class UserRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def create(self, user: User) -> None:
        try:
            self._s.add(
                UserRow(
                    id=user.id,
                    email=user.email,
                    password_hash=user.password_hash,
                    created_at=user.created_at,
                    is_single_user=user.is_single_user,
                )
            )
            self._s.flush()
        except IntegrityError as e:
            self._s.rollback()
            raise EmailAlreadyExistsError(user.email) from e

    def get(self, user_id: str) -> User:
        row = self._s.get(UserRow, user_id)
        if row is None:
            raise KeyError(user_id)
        return _to_user(row)

    def get_by_email(self, email: str) -> User | None:
        row = self._s.scalar(select(UserRow).where(UserRow.email == email))
        return _to_user(row) if row else None


def _to_user(row: UserRow) -> User:
    return User(
        id=row.id,
        email=row.email,
        password_hash=row.password_hash,
        created_at=ensure_utc(row.created_at),
        is_single_user=row.is_single_user,
    )
