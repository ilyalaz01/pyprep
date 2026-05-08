"""User entity, AccessToken result, and the AuthError hierarchy."""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class User:
    id: str
    email: str
    password_hash: str
    created_at: dt.datetime
    is_single_user: bool = False


@dataclass(frozen=True, slots=True)
class AccessToken:
    token: str
    user_id: str
    expires_at: dt.datetime


class AuthError(Exception):
    """Base class for AuthService errors."""


class EmailAlreadyExistsError(AuthError):
    """Raised when registering an email that is already taken."""


class InvalidCredentialsError(AuthError):
    """Raised on bad password OR unknown email — same error for both
    so callers cannot enumerate registered emails."""


class InvalidTokenError(AuthError):
    """Raised when a JWT is malformed, signed with the wrong key, or
    otherwise structurally invalid."""


class ExpiredTokenError(AuthError):
    """Raised when a JWT is structurally valid but past its `exp`."""
