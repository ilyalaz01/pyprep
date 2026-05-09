"""APIGatekeeper — single egress point for any future external HTTP call.

**SCOPE: OUTBOUND traffic only.** This is NOT an inbound rate limiter.
It throttles calls from PyPrep services TO external APIs (third-party
LLMs, content sources, etc.). Inbound rate limiting on `/api/*`
endpoints (audit N024) is a separate concern, deferred to Phase 10
and implemented at the FastAPI middleware layer — see NOTES N024.

MVP has no external integrations (per ADR-005 mock interviews are local
prompt-generators). The seam is pre-built so future callers route through
one rate-limit-aware chokepoint instead of scattering `httpx.request(...)`
across services.

Rate-limiting is a sliding window per host: keep a list of call timestamps
per host; if more than `max_calls` fall inside the last `window_seconds`,
raise `RateLimitedError`. The injected `clock` keeps the window
deterministic in tests.
"""

from __future__ import annotations

import time
from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Protocol
from urllib.parse import urlparse


class HTTPClient(Protocol):
    def request(self, method: str, url: str, **kwargs: Any) -> Any: ...


@dataclass(frozen=True, slots=True)
class RateLimit:
    max_calls: int
    window_seconds: int


class RateLimitedError(Exception):
    """Raised when a host's rate-limit window is full."""


class APIGatekeeper:
    def __init__(
        self,
        *,
        http: HTTPClient,
        limits: dict[str, RateLimit],
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._http = http
        self._limits = limits
        self._clock = clock
        self._calls: dict[str, list[float]] = defaultdict(list)

    def request(self, method: str, url: str, **kwargs: Any) -> Any:
        host = urlparse(url).netloc
        if host in self._limits:
            self._enforce(host, self._limits[host])
        return self._http.request(method, url, **kwargs)

    def _enforce(self, host: str, limit: RateLimit) -> None:
        now = self._clock()
        cutoff = now - limit.window_seconds
        recent = [t for t in self._calls[host] if t > cutoff]
        if len(recent) >= limit.max_calls:
            raise RateLimitedError(host)
        recent.append(now)
        self._calls[host] = recent
