"""Request/response logging middleware.

One JSON log line per request — method, path, status, duration_ms,
request_id. Bound to structlog's contextvars so router-level loggers
inherit `request_id` automatically (NFR-OBS-1).
"""

from __future__ import annotations

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_log = structlog.get_logger("pyprep.api")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        structlog.contextvars.bind_contextvars(request_id=request_id)
        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
        except Exception:  # logged then re-raised; centralized handler maps to 5xx
            duration_ms = (time.perf_counter() - start) * 1000.0
            _log.exception(
                "request_failed",
                method=request.method,
                path=request.url.path,
                duration_ms=round(duration_ms, 2),
            )
            structlog.contextvars.clear_contextvars()
            raise
        duration_ms = (time.perf_counter() - start) * 1000.0
        _log.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=round(duration_ms, 2),
        )
        response.headers["x-request-id"] = request_id
        structlog.contextvars.clear_contextvars()
        return response
