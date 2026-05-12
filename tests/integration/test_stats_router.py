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
    assert body["total_seconds"] == 0  # P7.T7.1 / ADR-027
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


# ---------------------------------------------------------------------------
# P7.T7.2 — per-module + daily endpoints (thin SDK wrappers).
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_per_module_requires_auth(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/stats/me/per-module")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_per_module_for_new_user_returns_empty(
    client: httpx.AsyncClient,
) -> None:
    token = await _register_and_login(client, "pm@example.com")
    r = await client.get(
        "/api/stats/me/per-module", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert r.json() == {"modules": []}


@pytest.mark.asyncio
async def test_daily_requires_auth(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/stats/me/daily")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_daily_for_new_user_returns_30_zero_days(
    client: httpx.AsyncClient,
) -> None:
    """daily_chart always returns `days` entries (zero-filled for days
    with no activity). New user → 30 entries, each reviews_total=0."""
    token = await _register_and_login(client, "daily@example.com")
    r = await client.get(
        "/api/stats/me/daily", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["days"]) == 30
    assert all(d["reviews_total"] == 0 for d in body["days"])
    # Date order: ascending (oldest first), per daily_chart impl.
    dates = [d["date"] for d in body["days"]]
    assert dates == sorted(dates)


@pytest.mark.asyncio
async def test_daily_days_query_param_honored(
    client: httpx.AsyncClient,
) -> None:
    token = await _register_and_login(client, "days@example.com")
    r = await client.get(
        "/api/stats/me/daily",
        params={"days": 7},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert len(r.json()["days"]) == 7


@pytest.mark.asyncio
async def test_daily_days_out_of_range_rejected(
    client: httpx.AsyncClient,
) -> None:
    """T7.2 caps `days` at 90 — see ADR-free policy note in routers/stats.py."""
    token = await _register_and_login(client, "cap@example.com")
    too_big = await client.get(
        "/api/stats/me/daily",
        params={"days": 365},
        headers={"Authorization": f"Bearer {token}"},
    )
    too_small = await client.get(
        "/api/stats/me/daily",
        params={"days": 0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert too_big.status_code == 422
    assert too_small.status_code == 422
