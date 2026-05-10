"""T3.3 — /api/modules listing + lesson fetch.

Reads against the real `content/` directory (loaded once into app state).
The endpoints are public — no auth required.
"""

from __future__ import annotations

import httpx
import pytest


@pytest.mark.asyncio
async def test_modules_listing_is_public_no_auth_required(
    client: httpx.AsyncClient,
) -> None:
    """T3.5.7 — module catalog is non-secret content. Lock the contract:
    no Authorization header → 200. A future change to require auth would
    flip this test and force a deliberate decision rather than silent drift."""
    r = await client.get("/api/modules")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_module_detail_is_public_no_auth_required(
    client: httpx.AsyncClient,
) -> None:
    r = await client.get("/api/modules/1")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_lesson_is_public_no_auth_required(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/modules/1/lesson/m1-s0")
    assert r.status_code == 200


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
    # T4.4: card_count is the sum across the module's spheres — the home
    # dashboard's modules list relies on it without a per-module fetch.
    assert isinstance(m1["card_count"], int)
    assert m1["card_count"] >= 1


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
async def test_sphere_summary_exposes_lesson_title_when_frontmatter_present(
    client: httpx.AsyncClient,
) -> None:
    """T4.5.6: SphereSummary carries the human lesson_title alongside the
    technical sphere_id, so the SPA can render readable row labels."""
    r = await client.get("/api/modules/1")
    assert r.status_code == 200
    spheres = {s["sphere_id"]: s for s in r.json()["spheres"]}
    # m1-s0 is the gold sample; its frontmatter includes title.
    assert "lesson_title" in spheres["m1-s0"]
    assert spheres["m1-s0"]["lesson_title"]  # non-empty


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
async def test_lesson_response_excludes_frontmatter_from_body(
    client: httpx.AsyncClient,
) -> None:
    """T4.5.1 — YAML frontmatter MUST be parsed out of lesson_md and
    surfaced in dedicated fields. The body the SPA renders shouldn't
    contain raw `module_id:` / `sphere_id:` / `title:` lines."""
    r = await client.get("/api/modules/1/lesson/m1-s0")
    assert r.status_code == 200
    body = r.json()
    md = body["lesson_md"]
    assert "module_id:" not in md, "frontmatter leaked into lesson_md"
    assert "sphere_id:" not in md
    assert not md.lstrip().startswith("---")


@pytest.mark.asyncio
async def test_lesson_response_exposes_frontmatter_fields(
    client: httpx.AsyncClient,
) -> None:
    """The H1, "N min read" subtitle, and tag chips read from these."""
    r = await client.get("/api/modules/1/lesson/m1-s0")
    body = r.json()
    assert body["lesson_title"]
    assert isinstance(body["lesson_estimated_minutes"], int)
    assert body["lesson_estimated_minutes"] > 0
    assert isinstance(body["lesson_tags"], list)


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
