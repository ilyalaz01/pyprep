"""AuthService — bcrypt password hashing + HS256 JWT issuance/verification.

Library notes (NOTES N011): we use `bcrypt` directly rather than `passlib`,
because `passlib` 1.7's bcrypt backend is broken against `bcrypt` ≥ 5.

Anti-enumeration: `login` returns `InvalidCredentialsError` whether the
email is unknown OR the password is wrong. Timing-parity (constant-time
verify on unknown email) is deferred to post-MVP per N011.

Clock authority: `verify_token` does NOT delegate `exp` checking to
`jose.jwt.decode` (which uses `time.time()`). It validates `exp` against
the injected `clock` so tests can advance time deterministically.
"""

from __future__ import annotations

import datetime as dt
import uuid
from collections.abc import Callable
from typing import Any

import bcrypt
from jose import JWTError, jwt

from .models import (
    AccessToken,
    ExpiredTokenError,
    InvalidCredentialsError,
    InvalidTokenError,
    User,
)
from .protocol import UserStore


def _now_utc() -> dt.datetime:
    return dt.datetime.now(dt.UTC)


class AuthService:
    def __init__(
        self,
        *,
        users: UserStore,
        secret: str,
        algorithm: str = "HS256",
        token_ttl: dt.timedelta = dt.timedelta(days=7),
        clock: Callable[[], dt.datetime] = _now_utc,
        id_factory: Callable[[], str] = lambda: str(uuid.uuid4()),
    ) -> None:
        if not secret:
            raise ValueError("secret must be non-empty")
        self._users = users
        self._secret = secret
        self._algorithm = algorithm
        self._ttl = token_ttl
        self._clock = clock
        self._new_id = id_factory

    def register(self, email: str, password: str) -> User:
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
        user = User(
            id=self._new_id(),
            email=email,
            password_hash=password_hash,
            created_at=self._clock(),
            is_single_user=False,
        )
        self._users.create(user)  # raises EmailAlreadyExistsError on duplicate
        return user

    def login(self, email: str, password: str) -> AccessToken:
        user = self._users.get_by_email(email)
        if user is None or not bcrypt.checkpw(
            password.encode("utf-8"), user.password_hash.encode("utf-8")
        ):
            raise InvalidCredentialsError()
        return self._issue(user.id)

    def verify_token(self, token: str) -> str:
        payload = self._decode(token)
        return str(payload["sub"])

    def refresh_token(self, token: str) -> AccessToken:
        payload = self._decode(token)
        return self._issue(str(payload["sub"]))

    def _issue(self, user_id: str) -> AccessToken:
        now = self._clock()
        exp = now + self._ttl
        token = jwt.encode(
            {"sub": user_id, "iat": int(now.timestamp()), "exp": int(exp.timestamp())},
            self._secret,
            algorithm=self._algorithm,
        )
        return AccessToken(token=token, user_id=user_id, expires_at=exp)

    def _decode(self, token: str) -> dict[str, Any]:
        try:
            payload: dict[str, Any] = jwt.decode(
                token,
                self._secret,
                algorithms=[self._algorithm],
                options={"verify_exp": False},
            )
        except JWTError as e:
            raise InvalidTokenError() from e
        exp = payload.get("exp")
        if isinstance(exp, int) and self._clock().timestamp() >= exp:
            raise ExpiredTokenError()
        return payload
