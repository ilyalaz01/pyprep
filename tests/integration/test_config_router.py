"""T4.2 — public /api/config for SPA boot-time deployment-mode detection.

Public endpoint (no auth). Response shape locked by these tests so a
future change is a deliberate test diff, not silent drift.

ADR-014: `single_user_email` is populated only when `single_user=true`;
multi-user deployments must return null to preserve anti-enumeration.
"""

from __future__ import annotations

import httpx
import pytest

from pyprep import __version__
from pyprep.sdk.shared.config import Settings

from .conftest import init_schema, with_lifespan


@pytest.mark.asyncio
async def test_config_is_public_no_auth_required(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/config")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_config_multi_user_omits_email(client: httpx.AsyncClient) -> None:
    """Default test_settings has single_user=False — email must be null."""
    r = await client.get("/api/config")
    assert r.status_code == 200
    body = r.json()
    assert body == {
        "single_user": False,
        "version": __version__,
        "single_user_email": None,
    }


@pytest.mark.asyncio
async def test_config_single_user_exposes_email(tmp_path) -> None:
    """In single-user deployments only, the owner email is exposed for
    SPA pre-fill (ADR-014 — single-user has no enumeration surface)."""
    settings = Settings(
        secret_key="x" * 48,
        database_url=f"sqlite:///{tmp_path / 'cfg.db'}",
        cors_origins=["http://localhost:5173"],
        single_user=True,
        single_user_email="owner@local.dev",
        single_user_password="owner-password-12345",
    )
    init_schema(settings)
    from pyprep.api.app import create_app

    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with with_lifespan(app), httpx.AsyncClient(
        transport=transport, base_url="http://t"
    ) as c:
        r = await c.get("/api/config")
    assert r.status_code == 200
    body = r.json()
    assert body == {
        "single_user": True,
        "version": __version__,
        "single_user_email": "owner@local.dev",
    }


@pytest.mark.asyncio
async def test_config_response_is_not_cached_with_no_store(
    client: httpx.AsyncClient,
) -> None:
    """`/api/config` is NOT under /api/auth/* so AuthNoStoreMiddleware
    leaves it cacheable. Pin this contract — caching the boot-time
    config response is desirable for SPA reload latency."""
    r = await client.get("/api/config")
    assert "no-store" not in (r.headers.get("cache-control") or "")
