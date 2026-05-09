"""Integration-test fixtures for the FastAPI app.

Each test gets a fresh `Settings` (in-memory SQLite, deterministic secret)
and a fresh `create_app(settings)` instance. No state leaks between tests.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import httpx
import pytest

from pyprep.sdk.shared.config import Settings

TEST_SECRET = "x" * 48  # ≥32 chars (T2.5.1 hardening)


@pytest.fixture
def test_settings(tmp_path) -> Settings:
    db_path = tmp_path / "pyprep_test.db"
    return Settings(
        secret_key=TEST_SECRET,
        database_url=f"sqlite:///{db_path}",
        cors_origins_raw="http://localhost:5173",
    )


@pytest.fixture
async def client(test_settings: Settings) -> AsyncIterator[httpx.AsyncClient]:
    from pyprep.api.app import create_app

    app = create_app(test_settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
