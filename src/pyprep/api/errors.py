"""Centralized SDK-exception → HTTP-response mapping.

T3.1 wires the registry; T3.2+ adds entries per router. Handlers MUST NOT
try/except SDK exceptions themselves — they raise, this layer maps. Keeps
each handler within Hard Rule 2's ≤10-LOC budget.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Mapping

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

ExceptionHandler = Callable[[Request, Exception], Awaitable[JSONResponse]]


class HTTPMapping:
    """Tuple of (HTTP status, public-facing error code) for an SDK exception."""

    __slots__ = ("code", "headers", "status")

    def __init__(
        self,
        status: int,
        code: str,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        self.status = status
        self.code = code
        self.headers = dict(headers) if headers else None


def install_error_handlers(app: FastAPI, mappings: dict[type[Exception], HTTPMapping]) -> None:
    for exc_type, mapping in mappings.items():
        app.add_exception_handler(exc_type, _handler_for(mapping))


def _handler_for(mapping: HTTPMapping) -> ExceptionHandler:
    async def _handle(_request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=mapping.status,
            content={"error": mapping.code, "detail": str(exc) or mapping.code},
            headers=mapping.headers,
        )

    return _handle
