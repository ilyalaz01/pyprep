"""T10.3a — ADR-012 FastAPI StaticFiles mount.

The mount is guarded by `DIST_DIR.exists()` so dev mode and CI — where
`frontend/dist` is absent — remain unaffected. Production containers
(where the multi-stage build copies the vite output into `dist/`) get
single-origin SPA serving without nginx in front.
"""

from __future__ import annotations

import httpx
import pytest

from pyprep.sdk.shared.config import Settings


@pytest.mark.asyncio
async def test_dist_absent_spa_fallback_not_registered(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
    test_settings: Settings,
) -> None:
    """When DIST_DIR doesn't exist, no SPA fallback route is registered:
    `/api/*` still works, `/` returns the default 404."""
    from pyprep.api import app as app_module

    monkeypatch.setattr(app_module, "DIST_DIR", tmp_path / "nonexistent")

    app = app_module.create_app(test_settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r_api = await c.get("/api/health")
        assert r_api.status_code == 200
        r_root = await c.get("/")
        assert r_root.status_code == 404


@pytest.mark.asyncio
async def test_dist_present_serves_spa_with_api_priority(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
    test_settings: Settings,
) -> None:
    """When DIST_DIR exists: SPA fallback serves index.html for any
    non-API path; /api/* keeps JSON behavior; /assets/* served from the
    assets mount; top-level files (favicon.svg) served by direct route."""
    fake_dist = tmp_path / "dist"
    fake_dist.mkdir()
    (fake_dist / "index.html").write_text(
        "<!doctype html><html><head><title>pyprep</title></head><body/></html>",
        encoding="utf-8",
    )
    (fake_dist / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    (fake_dist / "assets").mkdir()
    (fake_dist / "assets" / "app.js").write_text("/* js */", encoding="utf-8")

    from pyprep.api import app as app_module

    monkeypatch.setattr(app_module, "DIST_DIR", fake_dist)

    app = app_module.create_app(test_settings)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        # /api/* priority preserved — first registered, first matched.
        r = await c.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

        # GET / returns the SPA index.
        r = await c.get("/")
        assert r.status_code == 200
        assert "<title>pyprep</title>" in r.text

        # SPA fallback — unknown non-API path still resolves to index.html.
        r = await c.get("/home")
        assert r.status_code == 200
        assert "<title>pyprep</title>" in r.text

        # /api/<unmounted> stays JSON 404; SPA fallback must NOT swallow it.
        r = await c.get("/api/does-not-exist")
        assert r.status_code == 404
        assert "<title>pyprep</title>" not in r.text

        # Top-level static file (favicon.svg) served as the actual file.
        r = await c.get("/favicon.svg")
        assert r.status_code == 200
        assert "<svg" in r.text

        # /assets/* served by the StaticFiles mount.
        r = await c.get("/assets/app.js")
        assert r.status_code == 200
        assert "/* js */" in r.text
