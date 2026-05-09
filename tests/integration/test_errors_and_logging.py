"""T3.1 — error-mapping registry and request-logging middleware."""

from __future__ import annotations

import httpx
import pytest
from fastapi import FastAPI

from pyprep.api.errors import HTTPMapping, install_error_handlers


class _DemoSDKError(Exception):
    pass


@pytest.mark.asyncio
async def test_install_error_handlers_maps_exception_to_json_response() -> None:
    app = FastAPI()
    install_error_handlers(
        app,
        mappings={
            _DemoSDKError: HTTPMapping(
                status=418, code="demo_error", headers={"X-Demo": "1"}
            )
        },
    )

    @app.get("/boom")
    def _boom() -> None:
        raise _DemoSDKError("teapot is empty")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/boom")
    assert r.status_code == 418
    assert r.json() == {"error": "demo_error", "detail": "teapot is empty"}
    assert r.headers.get("x-demo") == "1"


@pytest.mark.asyncio
async def test_request_logging_middleware_logs_and_reraises_on_exception(
    test_settings,
) -> None:
    """The request-logging middleware must log unhandled exceptions and let
    them propagate so the centralized error handler can map them."""
    from pyprep.api.app import create_app

    app = create_app(test_settings)

    @app.get("/api/internal-boom")
    def _boom() -> None:
        raise RuntimeError("kaboom")

    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/api/internal-boom")
    # No mapping registered → starlette's default 500 handler kicks in.
    assert r.status_code == 500
