"""Tests for `pyprep.sdk.auth.AuthService` (T2.7).

Security-sensitive code: bcrypt password hashing + HS256 JWT issuance.
Tests pin: registration uniqueness, password is hashed not stored, login
on wrong-creds returns the same error for unknown-email and bad-password
(enumeration resistance), token verify rejects bad signature, expired
tokens are distinguishable from invalid ones, refresh rolls expiry.
"""

from __future__ import annotations

import datetime as dt

import pytest
from jose import jwt

from pyprep.sdk.auth import (
    AccessToken,
    AuthService,
    EmailAlreadyExistsError,
    ExpiredTokenError,
    InvalidCredentialsError,
    InvalidEmailError,
    InvalidTokenError,
    PasswordTooLongError,
    PasswordTooShortError,
    User,
)

SECRET = "test-secret-do-not-use-in-prod" + "x" * 8  # ≥ 32 chars per T2.5.1
T0 = dt.datetime(2026, 5, 8, 12, 0, tzinfo=dt.UTC)


class _FakeUserStore:
    def __init__(self) -> None:
        self.rows: dict[str, User] = {}

    def create(self, user: User) -> None:
        if any(u.email == user.email for u in self.rows.values()):
            raise EmailAlreadyExistsError(user.email)
        self.rows[user.id] = user

    def get_by_email(self, email: str) -> User | None:
        return next((u for u in self.rows.values() if u.email == email), None)

    def get(self, user_id: str) -> User:
        return self.rows[user_id]


@pytest.fixture
def store() -> _FakeUserStore:
    return _FakeUserStore()


@pytest.fixture
def auth(store: _FakeUserStore) -> AuthService:
    ids = iter(f"user-{i}" for i in range(1, 100))

    def next_id() -> str:
        return next(ids)

    return AuthService(
        users=store,
        secret=SECRET,
        token_ttl=dt.timedelta(days=7),
        clock=lambda: T0,
        id_factory=next_id,
    )


def test_init_rejects_empty_secret(store) -> None:
    with pytest.raises(ValueError, match="secret"):
        AuthService(users=store, secret="")


def test_register_rejects_password_below_min_length(auth: AuthService) -> None:
    with pytest.raises(PasswordTooShortError):
        auth.register(email="alice@example.com", password="short")


def test_register_accepts_password_exactly_72_bytes(auth: AuthService) -> None:
    pw_72 = "a" * 72
    user = auth.register(email="alice@example.com", password=pw_72)
    assert user.email == "alice@example.com"


def test_register_rejects_password_above_72_bytes(auth: AuthService) -> None:
    """72 is the bcrypt block limit; longer passwords are silently
    truncated. Reject explicitly so the user sees an error instead."""
    with pytest.raises(PasswordTooLongError):
        auth.register(email="alice@example.com", password="a" * 73)


def test_register_rejects_password_above_72_bytes_when_utf8_multibyte(auth: AuthService) -> None:
    """Each emoji is 4 bytes; 19 emoji = 76 bytes > 72."""
    long_emoji_pw = "🦄" * 19
    with pytest.raises(PasswordTooLongError):
        auth.register(email="alice@example.com", password=long_emoji_pw)


def test_register_rejects_invalid_email(auth: AuthService) -> None:
    with pytest.raises(InvalidEmailError):
        auth.register(email="not-an-email", password="hunter2hunter2")


def test_register_min_length_is_configurable(store) -> None:
    auth = AuthService(
        users=store,
        secret=SECRET,
        password_min_length=12,
        clock=lambda: T0,
        id_factory=lambda: "user-1",
    )

    with pytest.raises(PasswordTooShortError):
        auth.register(email="alice@example.com", password="hunter2hunt")  # 11 chars

    user = auth.register(email="alice@example.com", password="hunter2hunter")  # 13
    assert user.id == "user-1"


def test_register_creates_user_with_hashed_password(auth: AuthService, store) -> None:
    user = auth.register(email="alice@example.com", password="hunter2!")

    assert user.id == "user-1"
    assert user.email == "alice@example.com"
    assert user.password_hash != "hunter2"
    assert user.password_hash.startswith("$2")  # bcrypt prefix
    assert user.created_at == T0
    assert user.is_single_user is False
    assert store.get("user-1") == user


def test_register_propagates_is_single_user_when_configured(store) -> None:
    """T2.5.6 — when AuthService is constructed with is_single_user=True
    (Phase 3 wires this from Settings.single_user), the registered User
    carries that flag. SDK plumbing only — actual single-user mode flow
    lives in the API layer."""
    auth = AuthService(
        users=store,
        secret=SECRET,
        is_single_user=True,
        clock=lambda: T0,
        id_factory=lambda: "owner",
    )

    user = auth.register(email="owner@local.dev", password="owner-pw")

    assert user.is_single_user is True


def test_register_default_is_single_user_is_false(auth: AuthService) -> None:
    user = auth.register(email="alice@example.com", password="hunter2!")
    assert user.is_single_user is False


def test_register_duplicate_email_raises(auth: AuthService) -> None:
    auth.register(email="alice@example.com", password="hunter2!")

    with pytest.raises(EmailAlreadyExistsError, match="alice"):
        auth.register(email="alice@example.com", password="other-pw")


def test_login_returns_access_token(auth: AuthService) -> None:
    user = auth.register(email="alice@example.com", password="hunter2!")

    token = auth.login(email="alice@example.com", password="hunter2!")

    assert isinstance(token, AccessToken)
    assert token.user_id == user.id
    assert token.expires_at == T0 + dt.timedelta(days=7)
    payload = jwt.decode(token.token, SECRET, algorithms=["HS256"])
    assert payload["sub"] == user.id


def test_login_wrong_password_raises_invalid_credentials(auth: AuthService) -> None:
    auth.register(email="alice@example.com", password="hunter2!")

    with pytest.raises(InvalidCredentialsError):
        auth.login(email="alice@example.com", password="WRONG")


def test_login_unknown_email_raises_same_error(auth: AuthService) -> None:
    """Anti-enumeration: unknown email and wrong password must return the
    SAME error type so attackers can't tell which emails are registered."""
    with pytest.raises(InvalidCredentialsError):
        auth.login(email="nobody@example.com", password="anything")


def test_verify_token_returns_user_id(auth: AuthService) -> None:
    auth.register(email="alice@example.com", password="hunter2!")
    token = auth.login(email="alice@example.com", password="hunter2!")

    user_id = auth.verify_token(token.token)

    assert user_id == "user-1"


def test_verify_token_rejects_bad_signature(auth: AuthService) -> None:
    auth.register(email="alice@example.com", password="hunter2!")
    token = auth.login(email="alice@example.com", password="hunter2!")

    forged = token.token + "x"

    with pytest.raises(InvalidTokenError):
        auth.verify_token(forged)


def test_verify_token_rejects_token_signed_with_different_secret(store) -> None:
    auth = AuthService(
        users=store,
        secret=SECRET,
        clock=lambda: T0,
        id_factory=lambda: "user-1",
    )
    auth.register(email="alice@example.com", password="hunter2!")
    foreign_token = jwt.encode(
        {"sub": "user-1", "exp": int((T0 + dt.timedelta(days=1)).timestamp())},
        "DIFFERENT-SECRET",
        algorithm="HS256",
    )

    with pytest.raises(InvalidTokenError):
        auth.verify_token(foreign_token)


def test_verify_token_distinguishes_expired_from_invalid(store) -> None:
    issued_clock = [T0]
    auth = AuthService(
        users=store,
        secret=SECRET,
        token_ttl=dt.timedelta(minutes=5),
        clock=lambda: issued_clock[0],
        id_factory=lambda: "user-1",
    )
    auth.register(email="alice@example.com", password="hunter2!")
    token = auth.login(email="alice@example.com", password="hunter2!")

    issued_clock[0] = T0 + dt.timedelta(hours=1)  # advance past TTL

    with pytest.raises(ExpiredTokenError):
        auth.verify_token(token.token)


def test_verify_token_rejects_garbage_string(auth: AuthService) -> None:
    with pytest.raises(InvalidTokenError):
        auth.verify_token("not-a-real-jwt-at-all")


def test_refresh_token_extends_expiry(store) -> None:
    issued_clock = [T0]
    auth = AuthService(
        users=store,
        secret=SECRET,
        token_ttl=dt.timedelta(days=7),
        clock=lambda: issued_clock[0],
        id_factory=lambda: "user-1",
    )
    auth.register(email="alice@example.com", password="hunter2!")
    original = auth.login(email="alice@example.com", password="hunter2!")

    issued_clock[0] = T0 + dt.timedelta(days=2)
    refreshed = auth.refresh_token(original.token)

    assert refreshed.user_id == "user-1"
    assert refreshed.expires_at > original.expires_at
    assert refreshed.token != original.token


def test_refresh_expired_token_raises(store) -> None:
    issued_clock = [T0]
    auth = AuthService(
        users=store,
        secret=SECRET,
        token_ttl=dt.timedelta(minutes=5),
        clock=lambda: issued_clock[0],
        id_factory=lambda: "user-1",
    )
    auth.register(email="alice@example.com", password="hunter2!")
    token = auth.login(email="alice@example.com", password="hunter2!")

    issued_clock[0] = T0 + dt.timedelta(hours=1)

    with pytest.raises(ExpiredTokenError):
        auth.refresh_token(token.token)


# --- N012.1 / N012.2 polish nits (T3.2) ----------------------------------


def test_register_uses_explicit_bcrypt_rounds_12(auth: AuthService, store) -> None:
    """N012.1 — pin bcrypt cost factor explicitly so silent default drift in
    bcrypt versions cannot weaken (or accidentally strengthen) the hash."""
    user = auth.register(email="alice@example.com", password="hunter2!")
    stored = store.rows[user.id]
    # bcrypt hash format: $2b$<cost>$<22-char-salt><31-char-hash>
    parts = stored.password_hash.split("$")
    assert parts[1] == "2b"
    assert parts[2] == "12", f"expected cost=12, got cost={parts[2]}"


def test_decode_rejects_token_with_non_int_exp(auth: AuthService) -> None:
    """N012.2 — `_decode` must reject malformed `exp` (non-int or missing)
    instead of silently falling through. Today _issue always sets `exp` to
    an int, so this is contract-tightening, not a behavioral fix."""
    bad = jwt.encode(
        {"sub": "user-1", "iat": int(T0.timestamp()), "exp": "tomorrow"},
        SECRET,
        algorithm="HS256",
    )
    with pytest.raises(InvalidTokenError):
        auth.verify_token(bad)


def test_decode_rejects_token_with_missing_exp(auth: AuthService) -> None:
    """N012.2 — same contract: a token without `exp` is malformed."""
    bad = jwt.encode({"sub": "user-1", "iat": int(T0.timestamp())}, SECRET, algorithm="HS256")
    with pytest.raises(InvalidTokenError):
        auth.verify_token(bad)


def test_login_body_carries_n012_3_todo_comment() -> None:
    """N012.3 — surface the deferred N011 timing-parity decision at the
    call site (so a future reader sees it next to the unknown-email branch).
    Hard test against source so the comment is not deleted by accident."""
    import inspect

    src = inspect.getsource(AuthService.login)
    assert "TODO(public-mode)" in src
    assert "N011" in src
