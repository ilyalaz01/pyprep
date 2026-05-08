"""Tests for `pyprep.sdk.shared.gatekeeper.APIGatekeeper` (T2.8).

The gatekeeper is the single egress point for any future external HTTP
call. MVP has no external calls (per ADR-005 mock interviews are local
prompt-generators), so the seam is exercised purely with a fake HTTP
client. Real callers wire it in when external integrations land.
"""

from __future__ import annotations

import pytest

from pyprep.sdk.shared.gatekeeper import (
    APIGatekeeper,
    RateLimit,
    RateLimitedError,
)


class _FakeHTTP:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, dict]] = []

    def request(self, method: str, url: str, **kwargs: object) -> str:
        self.calls.append((method, url, dict(kwargs)))
        return f"resp:{method}:{url}"


def test_request_passes_through_when_no_limit() -> None:
    http = _FakeHTTP()
    gk = APIGatekeeper(http=http, limits={})

    out = gk.request("GET", "https://example.com/foo")

    assert out == "resp:GET:https://example.com/foo"
    assert http.calls == [("GET", "https://example.com/foo", {})]


def test_request_forwards_kwargs() -> None:
    http = _FakeHTTP()
    gk = APIGatekeeper(http=http, limits={})

    gk.request("POST", "https://example.com/x", json={"k": "v"}, timeout=5)

    assert http.calls[0][2] == {"json": {"k": "v"}, "timeout": 5}


def test_request_counts_within_limit() -> None:
    http = _FakeHTTP()
    clock = [0.0]
    gk = APIGatekeeper(
        http=http,
        limits={"api.example.com": RateLimit(max_calls=3, window_seconds=60)},
        clock=lambda: clock[0],
    )

    for _ in range(3):
        gk.request("GET", "https://api.example.com/x")

    assert len(http.calls) == 3


def test_request_raises_when_limit_exceeded() -> None:
    http = _FakeHTTP()
    clock = [0.0]
    gk = APIGatekeeper(
        http=http,
        limits={"api.example.com": RateLimit(max_calls=2, window_seconds=60)},
        clock=lambda: clock[0],
    )
    gk.request("GET", "https://api.example.com/x")
    gk.request("GET", "https://api.example.com/x")

    with pytest.raises(RateLimitedError, match=r"api\.example\.com"):
        gk.request("GET", "https://api.example.com/x")

    assert len(http.calls) == 2


def test_old_calls_outside_window_are_discarded() -> None:
    http = _FakeHTTP()
    clock = [0.0]
    gk = APIGatekeeper(
        http=http,
        limits={"api.example.com": RateLimit(max_calls=2, window_seconds=60)},
        clock=lambda: clock[0],
    )
    gk.request("GET", "https://api.example.com/x")
    gk.request("GET", "https://api.example.com/x")

    clock[0] = 61.0  # advance past the window

    gk.request("GET", "https://api.example.com/x")  # should succeed
    assert len(http.calls) == 3


def test_limits_are_per_host() -> None:
    http = _FakeHTTP()
    clock = [0.0]
    gk = APIGatekeeper(
        http=http,
        limits={
            "api.a.com": RateLimit(max_calls=1, window_seconds=60),
            "api.b.com": RateLimit(max_calls=1, window_seconds=60),
        },
        clock=lambda: clock[0],
    )
    gk.request("GET", "https://api.a.com/")
    gk.request("GET", "https://api.b.com/")  # different host — fine

    with pytest.raises(RateLimitedError):
        gk.request("GET", "https://api.a.com/")
