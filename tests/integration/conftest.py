"""Integration-test fixtures for the FastAPI app.

Each test gets a fresh `Settings` (file-backed SQLite under tmp_path,
deterministic secret) and a fresh `create_app(settings)` instance. No state
leaks between tests.

Tests build the schema via `Base.metadata.create_all` rather than running
alembic per-test (alembic is exercised separately in `test_alembic_migration.py`
which pins zero drift). This keeps integration tests fast.

`httpx.ASGITransport` does NOT trigger ASGI lifespan events (startup /
shutdown) — by design, since transports are protocol-only. For tests that
exercise startup behavior (single-user auto-create) wrap the client in
`with_lifespan(app)` to drive startup/shutdown around the httpx session.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
import pytest
from fastapi import FastAPI

from pyprep.sdk.shared.config import Settings


@asynccontextmanager
async def with_lifespan(app: FastAPI):
    """Drive the FastAPI lifespan around an `async with` block."""
    async with app.router.lifespan_context(app):
        yield

TEST_SECRET = "x" * 48  # ≥32 chars (T2.5.1 hardening)


def init_schema(settings: Settings) -> None:
    """Create all ORM tables on the engine for `settings`. Used by tests
    that construct their own apps (single-user tests) — `test_settings`
    fixture below also calls this for the standard `client` flow."""
    from pyprep.api.db import create_engine_for
    from pyprep.sdk.repos import models as _m  # noqa: F401
    from pyprep.sdk.repos.database import Base

    engine = create_engine_for(settings)
    Base.metadata.create_all(engine)


@pytest.fixture
def test_settings(tmp_path) -> Settings:
    db_path = tmp_path / "pyprep_test.db"
    settings = Settings(
        secret_key=TEST_SECRET,
        database_url=f"sqlite:///{db_path}",
        cors_origins=["http://localhost:5173"],
    )
    init_schema(settings)
    return settings


@pytest.fixture
async def client(test_settings: Settings) -> AsyncIterator[httpx.AsyncClient]:
    from pyprep.api.app import create_app

    app = create_app(test_settings)
    transport = httpx.ASGITransport(app=app)
    async with with_lifespan(app), httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as c:
        yield c
