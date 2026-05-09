"""Integration-test fixtures for the FastAPI app.

Each test gets a fresh `Settings` (file-backed SQLite under tmp_path,
deterministic secret) and a fresh `create_app(settings)` instance. No state
leaks between tests.

Schema source: `alembic upgrade head` (same code path as production —
the lifespan runs this on app startup, audit Section D #2 fix). Tests
that wrap with `with_lifespan(app)` get schema for free; tests that
construct settings without an app can call `init_schema(settings)`
directly, which is also `alembic upgrade head` (idempotent — safe to
call twice if both init_schema and lifespan run).

`httpx.ASGITransport` does NOT trigger ASGI lifespan events (startup /
shutdown) — by design, since transports are protocol-only. For tests that
exercise startup behavior (single-user auto-create) wrap the client in
`with_lifespan(app)` to drive startup/shutdown around the httpx session.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
import pytest
from alembic.config import Config
from fastapi import FastAPI

from alembic import command
from pyprep.sdk.shared.config import Settings

_REPO_ROOT = Path(__file__).resolve().parents[2]


@asynccontextmanager
async def with_lifespan(app: FastAPI):
    """Drive the FastAPI lifespan around an `async with` block."""
    async with app.router.lifespan_context(app):
        yield

TEST_SECRET = "x" * 48  # ≥32 chars (T2.5.1 hardening)


def init_schema(settings: Settings) -> None:
    """Run `alembic upgrade head` against `settings.database_url`.
    Same code path as production (lifespan); idempotent; safe to call
    twice in sequence with no error."""
    cfg = Config(str(_REPO_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(_REPO_ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    command.upgrade(cfg, "head")


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
