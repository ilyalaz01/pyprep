"""T3.1 — app factory + /api/health + CORS + SQLite FK PRAGMA listener."""

from __future__ import annotations

import httpx
import pytest

from pyprep import __version__
from pyprep.sdk.shared.config import Settings


@pytest.mark.asyncio
async def test_health_returns_status_version_db_ok(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body == {"status": "ok", "version": __version__, "db_ok": True}


@pytest.mark.asyncio
async def test_health_db_ok_false_when_db_unreachable(tmp_path) -> None:
    """Pointing at a directory (not a file) makes the SELECT 1 probe fail.
    The app must still respond 200 with db_ok=False — the smoke endpoint
    is the canary, not a hard-gate."""
    from pyprep.api.app import create_app

    bad = Settings(
        secret_key="x" * 48,
        database_url=f"sqlite:////{tmp_path}",  # path is a directory
        cors_origins=["http://localhost:5173"],
    )
    app = create_app(bad)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["db_ok"] is False


@pytest.mark.asyncio
async def test_cors_preflight_allows_configured_origin(
    client: httpx.AsyncClient,
) -> None:
    r = await client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


@pytest.mark.asyncio
async def test_cors_preflight_rejects_unconfigured_origin(
    client: httpx.AsyncClient,
) -> None:
    r = await client.options(
        "/api/health",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Starlette returns 400 for disallowed origins on preflight.
    assert "access-control-allow-origin" not in r.headers


def test_sqlite_pragma_foreign_keys_on_per_connection(tmp_path) -> None:
    """The PRAGMA listener must fire on every new connection from the pool,
    not just the first. We exercise two distinct connections from the same
    engine and assert both report foreign_keys=1."""
    from pyprep.api.db import create_engine_for

    settings = Settings(
        secret_key="x" * 48,
        database_url=f"sqlite:///{tmp_path / 'fk.db'}",
        cors_origins=["http://localhost:5173"],
    )
    engine = create_engine_for(settings)
    with engine.connect() as conn1:
        v1 = conn1.exec_driver_sql("PRAGMA foreign_keys").scalar()
    with engine.connect() as conn2:
        v2 = conn2.exec_driver_sql("PRAGMA foreign_keys").scalar()
    assert v1 == 1
    assert v2 == 1


def test_openapi_docs_reachable_at_api_docs() -> None:
    """`/api/docs` is the Phase 3 exit-gate URL; the OpenAPI route must mount
    under the `/api` prefix."""
    from fastapi.testclient import TestClient

    from pyprep.api.app import create_app

    settings = Settings(
        secret_key="x" * 48,
        database_url="sqlite:///:memory:",
        cors_origins=["http://localhost:5173"],
    )
    with TestClient(create_app(settings)) as c:
        r = c.get("/api/docs")
        assert r.status_code == 200
        assert "swagger" in r.text.lower()
