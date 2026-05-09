"""T4.2-unblock — alembic upgrade head MUST run on real app startup.

Audit Section D #2: tests used `Base.metadata.create_all` via the
integration conftest, so the production gap (no migrations on boot)
only surfaced at first user-facing request — `no such table: users`.
The lifespan now runs `alembic upgrade head` before single-user
auto-create. These tests pin that behavior.
"""

from __future__ import annotations

import httpx
import pytest
from sqlalchemy import create_engine, inspect

from pyprep.sdk.shared.config import Settings

from .conftest import with_lifespan


def _fresh_settings(tmp_path) -> Settings:
    db_path = tmp_path / "fresh_no_schema.db"
    return Settings(
        secret_key="x" * 48,
        database_url=f"sqlite:///{db_path}",
        cors_origins=["http://localhost:5173"],
    )


@pytest.mark.asyncio
async def test_lifespan_runs_migrations_on_fresh_db(tmp_path) -> None:
    """Boot the app against an empty sqlite file (no init_schema) and
    verify the users/sessions/reviews tables exist after lifespan ran."""
    from pyprep.api.app import create_app

    settings = _fresh_settings(tmp_path)
    app = create_app(settings)
    async with with_lifespan(app):
        pass  # just trigger startup

    engine = create_engine(settings.database_url)
    tables = set(inspect(engine).get_table_names())
    assert {"users", "sessions", "reviews", "alembic_version"} <= tables


@pytest.mark.asyncio
async def test_lifespan_migrations_idempotent_on_double_boot(tmp_path) -> None:
    """Booting twice in sequence must not raise — `alembic upgrade head`
    is no-op when DB is already at head."""
    from pyprep.api.app import create_app

    settings = _fresh_settings(tmp_path)
    app1 = create_app(settings)
    async with with_lifespan(app1):
        pass
    app2 = create_app(settings)
    async with with_lifespan(app2):
        pass  # no error → idempotency holds


@pytest.mark.asyncio
async def test_login_works_against_fresh_db_without_explicit_init_schema(
    tmp_path,
) -> None:
    """End-to-end regression: register → login round-trips against a DB
    that was never touched by `Base.metadata.create_all` — proving the
    migration path is what production will hit."""
    from pyprep.api.app import create_app

    settings = _fresh_settings(tmp_path)
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with with_lifespan(app), httpx.AsyncClient(
        transport=transport, base_url="http://t"
    ) as c:
        r = await c.post(
            "/api/auth/register",
            json={"email": "fresh@example.com", "password": "hunter2!extra"},
        )
        assert r.status_code == 201, r.text
        r = await c.post(
            "/api/auth/login",
            json={"email": "fresh@example.com", "password": "hunter2!extra"},
        )
        assert r.status_code == 200, r.text
        assert "access_token" in r.json()
