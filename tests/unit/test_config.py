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
    s = Settings(secret_key="abcd1234")  # type: ignore[call-arg]

    assert s.secret_key == "abcd1234"
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
    monkeypatch.setenv("PYPREP_SECRET_KEY", "from-env")
    monkeypatch.setenv("PYPREP_SINGLE_USER", "true")
    monkeypatch.setenv("PYPREP_DAILY_NEW_CARD_CAP", "42")
    monkeypatch.setenv("PYPREP_DATABASE_URL", "postgresql://localhost/pyprep")
    monkeypatch.setenv("PYPREP_LOG_LEVEL", "DEBUG")

    s = Settings()  # type: ignore[call-arg]

    assert s.secret_key == "from-env"
    assert s.single_user is True
    assert s.daily_new_card_cap == 42
    assert s.database_url == "postgresql://localhost/pyprep"
    assert s.log_level == "DEBUG"


def test_kwargs_override_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PYPREP_SECRET_KEY", "from-env")

    s = Settings(secret_key="from-kwarg")  # type: ignore[call-arg]

    assert s.secret_key == "from-kwarg"


def test_secret_key_must_be_non_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PYPREP_SECRET_KEY", "")

    with pytest.raises(ValidationError):
        Settings()  # type: ignore[call-arg]


def test_log_level_validates_known_value() -> None:
    with pytest.raises(ValidationError, match="log_level"):
        Settings(secret_key="x", log_level="LOUD")  # type: ignore[call-arg]
