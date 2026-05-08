"""PyPrep core SDK — pure-Python business logic, no HTTP, no I/O glue.

Single import surface for every consumer (REST handlers in Phase 3, future
CLI, integration tests). All public types are re-exported here so callers
never reach into sub-packages directly.
"""

from .auth import (
    AccessToken,
    AuthError,
    AuthService,
    EmailAlreadyExistsError,
    ExpiredTokenError,
    InvalidCredentialsError,
    InvalidEmailError,
    InvalidTokenError,
    PasswordTooLongError,
    PasswordTooShortError,
    User,
    UserStore,
)
from .cards import CardNotFoundError, CardService
from .content_loader import (
    Card,
    ContentIndex,
    ContentLoader,
    ContentLoaderError,
    SphereContent,
)
from .prompts import MockPrompt, MockPromptRequest, MockPromptService
from .repos import Base, ReviewRepository, SessionRepository, UserRepository
from .scheduler import CardState, FSRSScheduler, Rating
from .sessions import (
    Review,
    ReviewStore,
    Session,
    SessionFinishedError,
    SessionMode,
    SessionService,
    SessionStore,
    SessionSummary,
    SubmitResult,
)
from .shared.config import Settings
from .shared.gatekeeper import APIGatekeeper, RateLimit, RateLimitedError
from .stats import (
    DailyStat,
    ModuleStats,
    Overview,
    SphereStats,
    StatsRepository,
    StatsService,
)

__all__ = [
    "APIGatekeeper",
    "AccessToken",
    "AuthError",
    "AuthService",
    "Base",
    "Card",
    "CardNotFoundError",
    "CardService",
    "CardState",
    "ContentIndex",
    "ContentLoader",
    "ContentLoaderError",
    "DailyStat",
    "EmailAlreadyExistsError",
    "ExpiredTokenError",
    "FSRSScheduler",
    "InvalidCredentialsError",
    "InvalidEmailError",
    "InvalidTokenError",
    "MockPrompt",
    "MockPromptRequest",
    "MockPromptService",
    "ModuleStats",
    "Overview",
    "PasswordTooLongError",
    "PasswordTooShortError",
    "RateLimit",
    "RateLimitedError",
    "Rating",
    "Review",
    "ReviewRepository",
    "ReviewStore",
    "Session",
    "SessionFinishedError",
    "SessionMode",
    "SessionRepository",
    "SessionService",
    "SessionStore",
    "SessionSummary",
    "Settings",
    "SphereContent",
    "SphereStats",
    "StatsRepository",
    "StatsService",
    "SubmitResult",
    "User",
    "UserRepository",
    "UserStore",
]
