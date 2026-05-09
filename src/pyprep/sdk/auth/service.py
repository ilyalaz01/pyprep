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
from pydantic import TypeAdapter, ValidationError
from pydantic.networks import EmailStr

from .models import (
    AccessToken,
    ExpiredTokenError,
    InvalidCredentialsError,
    InvalidEmailError,
    InvalidTokenError,
    PasswordTooLongError,
    PasswordTooShortError,
    User,
)
from .protocol import UserStore

_BCRYPT_MAX_BYTES = 72  # bcrypt silently truncates at this length
_BCRYPT_ROUNDS = 12  # N012.1: pinned cost factor; bcrypt's default may drift
_EMAIL_VALIDATOR = TypeAdapter(EmailStr)


def _now_utc() -> dt.datetime:
    return dt.datetime.now(dt.UTC)


def _validate_email(raw: str) -> str:
    try:
        return str(_EMAIL_VALIDATOR.validate_python(raw))
    except ValidationError as e:
        raise InvalidEmailError(raw) from e


def _validate_password(password: str, min_length: int) -> None:
    if len(password) < min_length:
        raise PasswordTooShortError(
            f"password must be at least {min_length} characters"
        )
    if len(password.encode("utf-8")) > _BCRYPT_MAX_BYTES:
        raise PasswordTooLongError(
            f"password exceeds {_BCRYPT_MAX_BYTES}-byte bcrypt limit"
        )


class AuthService:
    def __init__(
        self,
        *,
        users: UserStore,
        secret: str,
        algorithm: str = "HS256",
        token_ttl: dt.timedelta = dt.timedelta(days=7),
        password_min_length: int = 8,
        is_single_user: bool = False,
        clock: Callable[[], dt.datetime] = _now_utc,
        id_factory: Callable[[], str] = lambda: str(uuid.uuid4()),
    ) -> None:
        if not secret:
            raise ValueError("secret must be non-empty")
        self._users = users
        self._secret = secret
        self._algorithm = algorithm
        self._ttl = token_ttl
        self._password_min_length = password_min_length
        self._is_single_user = is_single_user
        self._clock = clock
        self._new_id = id_factory

    def register(self, email: str, password: str) -> User:
        validated_email = _validate_email(email)
        _validate_password(password, self._password_min_length)
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
        ).decode("utf-8")
        user = User(
            id=self._new_id(),
            email=validated_email,
            password_hash=password_hash,
            created_at=self._clock(),
            is_single_user=self._is_single_user,
        )
        self._users.create(user)  # raises EmailAlreadyExistsError on duplicate
        return user

    def login(self, email: str, password: str) -> AccessToken:
        user = self._users.get_by_email(email)
        # TODO(public-mode): add dummy bcrypt.checkpw on the unknown-email
        # branch for timing parity (anti-enumeration). See NOTES N011.
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
        # T3.5.6: jti guarantees byte-distinct tokens even when iat/exp
        # collide at second resolution (back-to-back refresh calls).
        token = jwt.encode(
            {
                "sub": user_id,
                "iat": int(now.timestamp()),
                "exp": int(exp.timestamp()),
                "jti": uuid.uuid4().hex,
            },
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
        if not isinstance(exp, int):
            raise InvalidTokenError()  # N012.2: malformed/missing exp
        if self._clock().timestamp() >= exp:
            raise ExpiredTokenError()
        return payload
