"""T3.2 — single-user mode behavior.

Two pinned invariants:
  1. /api/auth/register returns 404 when settings.single_user is true
     (the endpoint conceptually does not exist in this deployment).
  2. The single-user account is auto-created on app startup, so
     /api/auth/login as that user works on a fresh DB.
"""

from __future__ import annotations

import httpx
import pytest

from pyprep.sdk.shared.config import Settings


def _single_user_settings(tmp_path) -> Settings:
    db_path = tmp_path / "single_user.db"
    return Settings(
        secret_key="x" * 48,
        database_url=f"sqlite:///{db_path}",
        cors_origins_raw="http://localhost:5173",
        single_user=True,
        single_user_email="owner@local.dev",
        single_user_password="owner-password-12345",
    )


@pytest.mark.asyncio
async def test_register_returns_404_in_single_user_mode(tmp_path) -> None:
    from pyprep.api.app import create_app

    settings = _single_user_settings(tmp_path)
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.post(
            "/api/auth/register",
            json={"email": "anyone@example.com", "password": "anything12345"},
        )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_single_user_owner_is_auto_created_at_startup(tmp_path) -> None:
    """Lifespan must run on a fresh DB → /login as the owner succeeds."""
    from pyprep.api.app import create_app

    settings = _single_user_settings(tmp_path)
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.post(
            "/api/auth/login",
            json={
                "email": "owner@local.dev",
                "password": "owner-password-12345",
            },
        )
    assert r.status_code == 200, r.text
    assert r.json()["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_single_user_startup_is_idempotent_on_second_boot(tmp_path) -> None:
    """Booting the app twice against the same DB must not raise (the auto-
    create step skips when the user already exists)."""
    from pyprep.api.app import create_app

    settings = _single_user_settings(tmp_path)
    app1 = create_app(settings)
    transport = httpx.ASGITransport(app=app1)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r1 = await c.post(
            "/api/auth/login",
            json={"email": "owner@local.dev", "password": "owner-password-12345"},
        )
    assert r1.status_code == 200

    # Second boot against the same DB file
    app2 = create_app(settings)
    transport2 = httpx.ASGITransport(app=app2)
    async with httpx.AsyncClient(transport=transport2, base_url="http://t") as c:
        r2 = await c.post(
            "/api/auth/login",
            json={"email": "owner@local.dev", "password": "owner-password-12345"},
        )
    assert r2.status_code == 200


def test_settings_rejects_single_user_without_password(tmp_path) -> None:
    """If single_user=True, single_user_password is required (set at config
    time, not deferred to a runtime crash)."""
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        Settings(
            secret_key="x" * 48,
            database_url=f"sqlite:///{tmp_path / 'x.db'}",
            single_user=True,
        )
