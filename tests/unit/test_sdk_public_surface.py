"""T2.11 — pin the SDK's public re-exports from `pyprep.sdk`.

A consumer (REST API in T3, future CLI, integration tests) should be able
to import every public class from one place. These tests check both the
module attribute and `__all__` membership so a regression is loud.
"""

from __future__ import annotations

import pyprep.sdk as sdk

EXPECTED = {
    # content
    "Card",
    "ContentIndex",
    "ContentLoader",
    "ContentLoaderError",
    "SphereContent",
    # cards
    "CardNotFoundError",
    "CardService",
    # scheduler
    "CardState",
    "FSRSScheduler",
    "Rating",
    # sessions
    "Review",
    "Session",
    "SessionFinishedError",
    "SessionMode",
    "SessionService",
    "SessionStore",
    "ReviewStore",
    "SessionSummary",
    "SubmitResult",
    # stats
    "DailyStat",
    "ModuleStats",
    "Overview",
    "SphereStats",
    "StatsRepository",
    "StatsService",
    # prompts
    "MockPrompt",
    "MockPromptRequest",
    "MockPromptService",
    # auth
    "AccessToken",
    "AuthError",
    "AuthService",
    "EmailAlreadyExistsError",
    "ExpiredTokenError",
    "InvalidCredentialsError",
    "InvalidTokenError",
    "User",
    "UserStore",
    # shared
    "APIGatekeeper",
    "RateLimit",
    "RateLimitedError",
    "Settings",
    # repos
    "Base",
    "ReviewRepository",
    "SessionRepository",
    "UserRepository",
}


def test_all_lists_every_public_export() -> None:
    assert set(sdk.__all__) == EXPECTED


def test_every_export_is_an_attribute() -> None:
    for name in sdk.__all__:
        assert hasattr(sdk, name), f"pyprep.sdk has no attribute {name}"
