"""T3.7 — POST /api/mock/prompt. Auth-gated; deterministic on same request."""

from __future__ import annotations

import httpx
import pytest

PASSWORD = "hunter2!extra"


async def _register_and_login(client: httpx.AsyncClient, email: str) -> str:
    await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    r = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    return r.json()["access_token"]


@pytest.mark.asyncio
async def test_mock_prompt_requires_auth(client: httpx.AsyncClient) -> None:
    r = await client.post("/api/mock/prompt", json={"count": 5})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_mock_prompt_returns_text_and_cards_used(
    client: httpx.AsyncClient,
) -> None:
    token = await _register_and_login(client, "mock@example.com")
    r = await client.post(
        "/api/mock/prompt",
        json={"modules": [1], "count": 5, "duration_minutes": 30, "seed": 42},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body["text"], str) and len(body["text"]) > 0
    assert isinstance(body["cards_used"], list)
    assert len(body["cards_used"]) == 5
    assert body["estimated_minutes"] == 30


@pytest.mark.asyncio
async def test_mock_prompt_is_deterministic_for_same_seed(
    client: httpx.AsyncClient,
) -> None:
    """PRD §3.6 FR-MOCK-4: same selection → same prompt (modulo seed)."""
    token = await _register_and_login(client, "det@example.com")
    body = {"modules": [1], "count": 5, "seed": 7}
    headers = {"Authorization": f"Bearer {token}"}
    r1 = await client.post("/api/mock/prompt", json=body, headers=headers)
    r2 = await client.post("/api/mock/prompt", json=body, headers=headers)
    assert r1.json()["cards_used"] == r2.json()["cards_used"]
    assert r1.json()["text"] == r2.json()["text"]


@pytest.mark.asyncio
async def test_mock_prompt_count_validation(client: httpx.AsyncClient) -> None:
    token = await _register_and_login(client, "count@example.com")
    r = await client.post(
        "/api/mock/prompt",
        json={"count": 0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_mock_prompt_card_answers_never_leak_into_text(
    client: httpx.AsyncClient,
) -> None:
    """SDK invariant pinned at the HTTP boundary: card answers / solutions
    must not appear in the prompt text — only topics / sphere_ids / difficulty."""
    token = await _register_and_login(client, "leak@example.com")
    r = await client.post(
        "/api/mock/prompt",
        json={"modules": [1], "count": 3, "seed": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    text = r.json()["text"]
    # No raw `answer:` / `solution_code` markers from the JSON fields
    assert "solution_code" not in text
    # The template intentionally does not echo card.raw fields
    assert "correct_index" not in text
