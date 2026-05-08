"""Persistence protocol for AuthService.

The SQLAlchemy implementation lands in T2.10. `create` MUST raise
`EmailAlreadyExistsError` if the email is already taken — the service
relies on it as the uniqueness gate.
"""

from __future__ import annotations

from typing import Protocol

from .models import User


class UserStore(Protocol):
    def create(self, user: User) -> None: ...
    def get_by_email(self, email: str) -> User | None: ...
    def get(self, user_id: str) -> User: ...
