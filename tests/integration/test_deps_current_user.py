"""T3.8 — `get_current_user` behavior pinned via a throwaway protected route.

Exercises the dep with: no header, malformed bearer token, expired token,
deleted-user-with-still-valid-token, and a happy-path request.
"""

from __future__ import annotations

import datetime as dt

import httpx
import pytest
from fastapi import Depends
from jose import jwt

from pyprep.api.deps import get_current_user
from pyprep.sdk.auth import User
from pyprep.sdk.shared.config import Settings


def _attach_protected(app, path: str = "/api/_test/me") -> None:
    @app.get(path)
    def _me(user: User = Depends(get_current_user)) -> dict[str, str]:
        return {"id": user.id, "email": user.email}


@pytest.mark.asyncio
async def test_current_user_no_header_returns_401(client: httpx.AsyncClient) -> None:
    _attach_protected(client._transport.app)  # type: ignore[attr-defined]
    r = await client.get("/api/_test/me")
    assert r.status_code == 401
    assert r.json()["error"] == "invalid_token"


@pytest.mark.asyncio
async def test_current_user_malformed_token_returns_401(
    client: httpx.AsyncClient,
) -> None:
    _attach_protected(client._transport.app)  # type: ignore[attr-defined]
    r = await client.get(
        "/api/_test/me", headers={"Authorization": "Bearer not.a.real.jwt"}
    )
    assert r.status_code == 401
    assert r.json()["error"] == "invalid_token"


@pytest.mark.asyncio
async def test_current_user_expired_token_returns_401(
    client: httpx.AsyncClient, test_settings: Settings
) -> None:
    _attach_protected(client._transport.app)  # type: ignore[attr-defined]
    past = int((dt.datetime.now(dt.UTC) - dt.timedelta(hours=1)).timestamp())
    expired = jwt.encode(
        {"sub": "user-x", "iat": past - 60, "exp": past},
        test_settings.secret_key,
        algorithm="HS256",
    )
    r = await client.get(
        "/api/_test/me", headers={"Authorization": f"Bearer {expired}"}
    )
    assert r.status_code == 401
    assert r.json()["error"] == "token_expired"


@pytest.mark.asyncio
async def test_current_user_token_for_deleted_user_returns_401(
    client: httpx.AsyncClient, test_settings: Settings
) -> None:
    """Token decodes successfully but the referenced user is gone — must
    map to invalid_token, not a server error."""
    _attach_protected(client._transport.app)  # type: ignore[attr-defined]
    future = int((dt.datetime.now(dt.UTC) + dt.timedelta(hours=1)).timestamp())
    valid_for_ghost = jwt.encode(
        {"sub": "ghost-user-id", "iat": future - 3600, "exp": future},
        test_settings.secret_key,
        algorithm="HS256",
    )
    r = await client.get(
        "/api/_test/me", headers={"Authorization": f"Bearer {valid_for_ghost}"}
    )
    assert r.status_code == 401
    assert r.json()["error"] == "invalid_token"


@pytest.mark.asyncio
async def test_current_user_happy_path_returns_user(
    client: httpx.AsyncClient,
) -> None:
    _attach_protected(client._transport.app)  # type: ignore[attr-defined]
    await client.post(
        "/api/auth/register",
        json={"email": "me@example.com", "password": "hunter2!extra"},
    )
    login = await client.post(
        "/api/auth/login",
        json={"email": "me@example.com", "password": "hunter2!extra"},
    )
    token = login.json()["access_token"]
    r = await client.get(
        "/api/_test/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert r.json()["email"] == "me@example.com"
