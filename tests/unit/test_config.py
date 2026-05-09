"""Tests for `pyprep.sdk.shared.config.Settings` (T2.9).

Settings is a pydantic-settings model. Tests cover env loading, defaults,
type coercion, and the required-secret-key gate.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from pyprep.sdk.shared.config import Settings


def test_constructor_kwargs_load() -> None:
    s = Settings(secret_key="a" * 32)  # type: ignore[call-arg]

    assert s.secret_key == "a" * 32
    assert s.database_url == "sqlite:///./pyprep.db"
    assert s.single_user is False
    assert s.daily_new_card_cap == 15
    assert s.jwt_ttl_days == 7
    assert s.log_level == "INFO"
    assert s.content_root == Path("content")


def test_missing_secret_key_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PYPREP_SECRET_KEY", raising=False)

    with pytest.raises(ValidationError, match="secret_key"):
        Settings()  # type: ignore[call-arg]


def test_loads_from_env_vars(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PYPREP_SECRET_KEY", "from-env-padded-to-thirtytwo-chars!")
    monkeypatch.setenv("PYPREP_SINGLE_USER", "true")
    monkeypatch.setenv("PYPREP_SINGLE_USER_PASSWORD", "owner-pw-12345")  # T3.2
    monkeypatch.setenv("PYPREP_DAILY_NEW_CARD_CAP", "42")
    monkeypatch.setenv("PYPREP_DATABASE_URL", "postgresql://localhost/pyprep")
    monkeypatch.setenv("PYPREP_LOG_LEVEL", "DEBUG")

    s = Settings()  # type: ignore[call-arg]

    assert s.secret_key == "from-env-padded-to-thirtytwo-chars!"
    assert s.single_user is True
    assert s.single_user_password is not None
    assert s.single_user_password.get_secret_value() == "owner-pw-12345"
    assert s.daily_new_card_cap == 42
    assert s.database_url == "postgresql://localhost/pyprep"
    assert s.log_level == "DEBUG"


def test_kwargs_override_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PYPREP_SECRET_KEY", "from-env-padded-to-thirtytwo-chars!")

    s = Settings(secret_key="from-kwarg-also-32-chars-padding!")  # type: ignore[call-arg]

    assert s.secret_key == "from-kwarg-also-32-chars-padding!"


def test_secret_key_must_be_non_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PYPREP_SECRET_KEY", "")

    with pytest.raises(ValidationError):
        Settings()  # type: ignore[call-arg]


def test_log_level_validates_known_value() -> None:
    with pytest.raises(ValidationError, match="log_level"):
        Settings(secret_key="a" * 32, log_level="LOUD")  # type: ignore[call-arg]


def test_secret_under_32_chars_rejected_at_settings_load() -> None:
    """T2.5.1: secret_key must be ≥32 chars to make HS256 brute-force
    impractical. Tightened from min_length=1."""
    with pytest.raises(ValidationError, match="secret_key"):
        Settings(secret_key="short")  # type: ignore[call-arg]


def test_password_min_length_default_is_8() -> None:
    s = Settings(secret_key="a" * 32)  # type: ignore[call-arg]
    assert s.password_min_length == 8


def test_password_min_length_must_be_4_to_128() -> None:
    with pytest.raises(ValidationError):
        Settings(secret_key="a" * 32, password_min_length=2)  # type: ignore[call-arg]
    with pytest.raises(ValidationError):
        Settings(secret_key="a" * 32, password_min_length=200)  # type: ignore[call-arg]


# --- T4.2 unblock: cors_origins default-tightness regression guards ----


def test_cors_default_includes_vite_dev_origin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With no PYPREP_CORS_ORIGINS env var set, an out-of-the-box dev
    boot must allow the Vite dev server origin. Without this default
    the SPA can't talk to the API on first launch."""
    monkeypatch.delenv("PYPREP_CORS_ORIGINS", raising=False)
    s = Settings(secret_key="a" * 32)  # type: ignore[call-arg]
    assert "http://localhost:5173" in s.cors_origins


def test_cors_origins_never_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """Defends against a future 'clean up the default' edit that
    accidentally turns CORS into a deny-all on dev startup."""
    monkeypatch.delenv("PYPREP_CORS_ORIGINS", raising=False)
    s = Settings(secret_key="a" * 32)  # type: ignore[call-arg]
    assert len(s.cors_origins) >= 1


def test_cors_default_includes_cra_dev_origin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Cover the CRA-style 3000 port too — the broader 'works out of the
    box' contract isn't Vite-specific."""
    monkeypatch.delenv("PYPREP_CORS_ORIGINS", raising=False)
    s = Settings(secret_key="a" * 32)  # type: ignore[call-arg]
    assert "http://localhost:3000" in s.cors_origins
