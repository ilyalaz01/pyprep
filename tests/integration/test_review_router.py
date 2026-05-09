"""T3.5 — /api/review/queue. Auth-gated; returns FSRS-due card_ids only."""

from __future__ import annotations

import httpx
import pytest

PASSWORD = "hunter2!extra"


async def _register_and_login(client: httpx.AsyncClient, email: str) -> str:
    await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    r = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    return r.json()["access_token"]


@pytest.mark.asyncio
async def test_review_queue_requires_auth(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/review/queue")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_review_queue_empty_for_new_user(client: httpx.AsyncClient) -> None:
    """Fresh user has no Reviews → due_card_ids returns []. The endpoint
    must respond 200 with an empty list, not 404 or 500."""
    token = await _register_and_login(client, "queue@example.com")
    r = await client.get(
        "/api/review/queue", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body == {"card_ids": [], "sphere_id": None}


@pytest.mark.asyncio
async def test_review_queue_filters_by_sphere(client: httpx.AsyncClient) -> None:
    token = await _register_and_login(client, "spherefilter@example.com")
    r = await client.get(
        "/api/review/queue",
        params={"sphere_id": "m1-s0", "limit": 10},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["sphere_id"] == "m1-s0"


@pytest.mark.asyncio
async def test_review_queue_validates_limit(client: httpx.AsyncClient) -> None:
    token = await _register_and_login(client, "limit@example.com")
    r = await client.get(
        "/api/review/queue",
        params={"limit": 0},  # below ge=1
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422
