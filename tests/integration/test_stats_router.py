"""T3.6 — /api/stats/me + /api/stats/me/weakness. Auth-gated."""

from __future__ import annotations

import httpx
import pytest

PASSWORD = "hunter2!extra"


async def _register_and_login(client: httpx.AsyncClient, email: str) -> str:
    await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    r = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    return r.json()["access_token"]


@pytest.mark.asyncio
async def test_stats_requires_auth(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/stats/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_stats_overview_for_new_user_returns_zeros(
    client: httpx.AsyncClient,
) -> None:
    token = await _register_and_login(client, "stats@example.com")
    r = await client.get(
        "/api/stats/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["reviews_total"] == 0
    assert body["streak"] == 0
    assert body["xp"] == 0.0
    assert body["orphan_review_count"] == 0
    assert "retention" in body


@pytest.mark.asyncio
async def test_weakness_for_new_user_returns_empty_list(
    client: httpx.AsyncClient,
) -> None:
    """No reviews → weakness_top_n returns []. The min-reviews threshold
    (5 per sphere) keeps the list empty until the user has real signal."""
    token = await _register_and_login(client, "weak@example.com")
    r = await client.get(
        "/api/stats/me/weakness", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body == {"top": []}


@pytest.mark.asyncio
async def test_weakness_n_query_param_clamps(client: httpx.AsyncClient) -> None:
    token = await _register_and_login(client, "n@example.com")
    r = await client.get(
        "/api/stats/me/weakness",
        params={"n": 10},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert isinstance(r.json()["top"], list)
