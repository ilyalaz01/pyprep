"""T3.5.5 — pin: NO secret bytes ever appear in structlog output.

Uses `structlog.testing.capture_logs()` — the canonical helper that
sidesteps the cached-logger problem by injecting a capture processor
into every log call regardless of when the logger was bound.

Runs a realistic auth + session + answer flow, then scans the captured
records for forbidden substrings:

  - the registration password
  - any JWT bytes (the `eyJ` header prefix)
  - the idempotency_key value used
  - the literal key name `password` in any structured field

This is the regression-catching test that prevents a future
"let me debug-log the body" PR from leaking secrets to logs.
"""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest
import structlog
from structlog.testing import capture_logs

from pyprep.sdk.shared.config import Settings

from .conftest import init_schema, with_lifespan

PASSWORD = "Hunter2-Verbose-Secret-That-Should-Never-Appear"  # 49 chars
IDEMPOTENCY_KEY = "key-T35-5-secret-DO-NOT-LOG-THIS-1234567890"
EMAIL = "loghygiene@example.com"


def _all_text(records: list[dict[str, Any]]) -> str:
    """Flatten every record (keys + values) into one searchable blob.
    Catches both `event="logging password=hunter2"` AND
    `password="hunter2"` structured-field forms."""
    return "\n".join(json.dumps(r, default=str) for r in records)


@pytest.mark.asyncio
async def test_no_secrets_in_logs_across_full_auth_session_flow(tmp_path) -> None:
    settings = Settings(
        secret_key="x" * 48,
        database_url=f"sqlite:///{tmp_path / 'log.db'}",
        cors_origins=["http://localhost:5173"],
    )
    init_schema(settings)
    from pyprep.api.app import create_app

    app = create_app(settings)

    with capture_logs() as records:
        transport = httpx.ASGITransport(app=app)
        async with with_lifespan(app), httpx.AsyncClient(
            transport=transport, base_url="http://t"
        ) as c:
            await c.post(
                "/api/auth/register",
                json={"email": EMAIL, "password": PASSWORD},
            )
            login = await c.post(
                "/api/auth/login", json={"email": EMAIL, "password": PASSWORD}
            )
            token = login.json()["access_token"]
            sess = await c.post(
                "/api/sessions",
                json={"mode": "learn", "sphere_id": "m1-s0", "limit": 2},
                headers={"Authorization": f"Bearer {token}"},
            )
            queue = sess.json()["queue"]
            await c.get(
                f"/api/sessions/{sess.json()['id']}/next",
                headers={"Authorization": f"Bearer {token}"},
            )
            await c.post(
                f"/api/sessions/{sess.json()['id']}/answer",
                json={
                    "card_id": queue[0],
                    "rating": 3,
                    "response_ms": 1234,
                    "idempotency_key": IDEMPOTENCY_KEY,
                },
                headers={"Authorization": f"Bearer {token}"},
            )

    blob = _all_text(records)

    assert len(records) > 0, "no logs captured — test setup broken"
    assert PASSWORD not in blob, "registration password leaked into logs"
    # `eyJ` is the base64url prefix every JWT header starts with.
    assert "eyJ" not in blob, "JWT bytes leaked into logs"
    assert IDEMPOTENCY_KEY not in blob, "idempotency_key leaked into logs"
    for r in records:
        assert "password" not in r, f"`password` key leaked in record: {r}"


def test_structlog_testing_helper_sees_calls_through_cached_loggers() -> None:
    """Sanity check the test mechanism itself: a module-level cached logger
    (the situation in api/middleware.py and api/lifespan.py) MUST be
    visible to capture_logs(). If structlog ever changes this contract,
    the regression test above would silently pass on a real leak."""
    cached = structlog.get_logger("pyprep.test.cache")
    cached.info("warm")  # bind the logger before capture
    with capture_logs() as records:
        cached.info("captured", marker="x")
    assert any(r.get("event") == "captured" and r.get("marker") == "x" for r in records)
