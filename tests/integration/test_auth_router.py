"""T3.2 — /api/auth/{register,login,refresh} integration tests.

Hits the test app via httpx ASGI transport. Each test gets a fresh DB
(via the `client` fixture in conftest.py) so registration tests don't
pollute each other.
"""

from __future__ import annotations

import datetime as dt

import httpx
import pytest
from jose import jwt

from pyprep.sdk.shared.config import Settings

PASSWORD = "hunter2!extra"  # >8 chars, well under 72-byte limit


@pytest.mark.asyncio
async def test_register_201_returns_user(client: httpx.AsyncClient) -> None:
    r = await client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "password": PASSWORD},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "alice@example.com"
    assert "id" in body and len(body["id"]) > 0
    assert "created_at" in body
    assert "password_hash" not in body  # secret never leaks back


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client: httpx.AsyncClient) -> None:
    r1 = await client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "password": PASSWORD},
    )
    assert r1.status_code == 201
    r2 = await client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "password": PASSWORD},
    )
    assert r2.status_code == 409
    assert r2.json()["error"] == "email_exists"


@pytest.mark.asyncio
async def test_register_invalid_email_returns_422(client: httpx.AsyncClient) -> None:
    r = await client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": PASSWORD},
    )
    # Pydantic EmailStr rejects at Pydantic-validation time → 422.
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_register_short_password_returns_422(client: httpx.AsyncClient) -> None:
    r = await client.post(
        "/api/auth/register",
        json={"email": "shorty@example.com", "password": "abc"},
    )
    assert r.status_code == 422
    assert r.json()["error"] == "password_too_short"


@pytest.mark.asyncio
async def test_register_too_long_password_returns_422(client: httpx.AsyncClient) -> None:
    too_long = "a" * 100
    r = await client.post(
        "/api/auth/register",
        json={"email": "long@example.com", "password": too_long},
    )
    assert r.status_code == 422
    assert r.json()["error"] == "password_too_long"


@pytest.mark.asyncio
async def test_login_response_carries_no_store_cache_headers(
    client: httpx.AsyncClient,
) -> None:
    """T3.5.4 — JWT-bearing responses MUST NOT be cacheable. Browsers,
    proxies, and back/forward caches can otherwise replay a logged-out
    user's token."""
    await client.post(
        "/api/auth/register", json={"email": "cc@example.com", "password": PASSWORD}
    )
    r = await client.post(
        "/api/auth/login", json={"email": "cc@example.com", "password": PASSWORD}
    )
    assert r.status_code == 200
    assert r.headers.get("cache-control") == "no-store"
    assert r.headers.get("pragma") == "no-cache"


@pytest.mark.asyncio
async def test_register_response_carries_no_store_cache_headers(
    client: httpx.AsyncClient,
) -> None:
    """register doesn't return a token but the email-vs-id mapping is
    still sensitive enough to skip caches."""
    r = await client.post(
        "/api/auth/register",
        json={"email": "ccr@example.com", "password": PASSWORD},
    )
    assert r.status_code == 201
    assert r.headers.get("cache-control") == "no-store"


@pytest.mark.asyncio
async def test_non_auth_response_does_not_set_no_store(
    client: httpx.AsyncClient,
) -> None:
    """Health is a smoke endpoint, not auth — should NOT carry no-store
    (would defeat any reverse-proxy caching layered on top later)."""
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert "no-store" not in (r.headers.get("cache-control") or "")


@pytest.mark.asyncio
async def test_login_returns_bearer_token_response_shape(
    client: httpx.AsyncClient, test_settings: Settings
) -> None:
    await client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "password": PASSWORD},
    )
    r = await client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": PASSWORD},
    )
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"access_token", "token_type", "expires_at"}
    assert body["token_type"] == "bearer"
    # token decodes against the test secret
    decoded = jwt.decode(body["access_token"], test_settings.secret_key, algorithms=["HS256"])
    assert decoded["sub"] != ""


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client: httpx.AsyncClient) -> None:
    await client.post(
        "/api/auth/register", json={"email": "a@b.com", "password": PASSWORD}
    )
    r = await client.post(
        "/api/auth/login", json={"email": "a@b.com", "password": "wrong-password"}
    )
    assert r.status_code == 401
    assert r.json()["error"] == "invalid_credentials"


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(client: httpx.AsyncClient) -> None:
    r = await client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": PASSWORD}
    )
    assert r.status_code == 401
    # Same error for both cases — anti-enumeration.
    assert r.json()["error"] == "invalid_credentials"


@pytest.mark.asyncio
async def test_refresh_with_valid_token_returns_new_token(
    client: httpx.AsyncClient,
) -> None:
    await client.post(
        "/api/auth/register", json={"email": "ref@example.com", "password": PASSWORD}
    )
    login = await client.post(
        "/api/auth/login", json={"email": "ref@example.com", "password": PASSWORD}
    )
    token = login.json()["access_token"]
    r = await client.post(
        "/api/auth/refresh", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"] != ""


@pytest.mark.asyncio
async def test_refresh_with_no_token_returns_401(client: httpx.AsyncClient) -> None:
    r = await client.post("/api/auth/refresh")
    assert r.status_code == 401
    assert "www-authenticate" in r.headers


@pytest.mark.asyncio
async def test_refresh_with_malformed_token_returns_401_with_www_authenticate(
    client: httpx.AsyncClient,
) -> None:
    r = await client.post(
        "/api/auth/refresh", headers={"Authorization": "Bearer not.a.jwt"}
    )
    assert r.status_code == 401
    assert r.headers.get("www-authenticate", "").lower().startswith("bearer")


@pytest.mark.asyncio
async def test_refresh_with_expired_token_returns_401_with_www_authenticate(
    test_settings: Settings,
) -> None:
    """Build a token whose exp is in the past, then call /refresh and expect
    401 + WWW-Authenticate: Bearer (per RFC 6750)."""
    from pyprep.api.app import create_app

    app = create_app(test_settings)
    past_exp = int((dt.datetime.now(dt.UTC) - dt.timedelta(hours=1)).timestamp())
    expired = jwt.encode(
        {"sub": "user-x", "iat": past_exp - 60, "exp": past_exp},
        test_settings.secret_key,
        algorithm="HS256",
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.post(
            "/api/auth/refresh", headers={"Authorization": f"Bearer {expired}"}
        )
    assert r.status_code == 401
    assert r.headers.get("www-authenticate", "").lower().startswith("bearer")
    assert r.json()["error"] == "token_expired"
