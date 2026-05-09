"""T3.3 — /api/modules listing + lesson fetch.

Reads against the real `content/` directory (loaded once into app state).
The endpoints are public — no auth required.
"""

from __future__ import annotations

import httpx
import pytest


@pytest.mark.asyncio
async def test_list_modules_returns_module_summaries(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/modules")
    assert r.status_code == 200
    body = r.json()
    assert "modules" in body
    mods = body["modules"]
    assert any(m["module_id"] == 1 for m in mods)
    m1 = next(m for m in mods if m["module_id"] == 1)
    assert isinstance(m1["sphere_ids"], list)
    assert "m1-s0" in m1["sphere_ids"]


@pytest.mark.asyncio
async def test_get_module_returns_spheres_with_card_counts(
    client: httpx.AsyncClient,
) -> None:
    r = await client.get("/api/modules/1")
    assert r.status_code == 200
    body = r.json()
    assert body["module_id"] == 1
    spheres = {s["sphere_id"]: s for s in body["spheres"]}
    assert "m1-s0" in spheres
    assert spheres["m1-s0"]["card_count"] >= 1
    assert spheres["m1-s0"]["lesson_present"] is True


@pytest.mark.asyncio
async def test_get_unknown_module_returns_404(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/modules/999")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_lesson_returns_markdown(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/modules/1/lesson/m1-s0")
    assert r.status_code == 200
    body = r.json()
    assert body["sphere_id"] == "m1-s0"
    assert body["module_id"] == 1
    assert isinstance(body["lesson_md"], str)
    assert len(body["lesson_md"]) > 0
    assert body["card_count"] >= 1


@pytest.mark.asyncio
async def test_get_lesson_unknown_sphere_returns_404(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/modules/1/lesson/m1-s999")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_lesson_sphere_in_wrong_module_returns_404(
    client: httpx.AsyncClient,
) -> None:
    """If the sphere exists but isn't in the requested module, 404 — the
    URL combination is invalid even if both pieces resolve in isolation."""
    r = await client.get("/api/modules/2/lesson/m1-s0")
    assert r.status_code == 404
