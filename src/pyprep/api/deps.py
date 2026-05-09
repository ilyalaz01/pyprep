"""FastAPI dependencies — the app's seam between handlers and the SDK.

T3.8 lives here, kept inline with T3.2 (auth wiring) so the dep shapes are
decided in one pass. Each dep is a single fn returning either a
configuration value, an SDK service, or the current `User`. Handlers MUST
NOT instantiate SDK services directly — they `Depends(get_<service>)` so
tests can override at the FastAPI dependency-graph level.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import Iterator

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from pyprep.sdk.auth import AuthService, InvalidTokenError, User
from pyprep.sdk.auth.protocol import UserStore
from pyprep.sdk.cards import CardService
from pyprep.sdk.content_loader import ContentIndex
from pyprep.sdk.prompts import MockPromptService
from pyprep.sdk.repos.reviews import ReviewRepository
from pyprep.sdk.repos.sessions import SessionRepository
from pyprep.sdk.repos.users import UserRepository
from pyprep.sdk.scheduler import FSRSScheduler
from pyprep.sdk.sessions import SessionService
from pyprep.sdk.shared.config import Settings
from pyprep.sdk.stats import StatsService

bearer_scheme = HTTPBearer(auto_error=False)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings  # type: ignore[no-any-return]


def get_content_index(request: Request) -> ContentIndex:
    return request.app.state.content_index  # type: ignore[no-any-return]


def get_db_session(request: Request) -> Iterator[Session]:
    """Session-per-request: commit on clean return, rollback on exception.
    The repos use `flush()` (not `commit()`) so this dep owns transaction
    boundaries. `request_id` from the logging middleware is bound to the
    current contextvars and inherited by any structlog calls inside."""
    sm = request.app.state.sessionmaker
    session = sm()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_user_store(session: Session = Depends(get_db_session)) -> UserStore:
    return UserRepository(session)


def get_card_service(index: ContentIndex = Depends(get_content_index)) -> CardService:
    return CardService(index)


def get_session_service(
    session: Session = Depends(get_db_session),
    cards: CardService = Depends(get_card_service),
) -> SessionService:
    return SessionService(
        cards=cards,
        scheduler=FSRSScheduler(),
        sessions=SessionRepository(session),
        reviews=ReviewRepository(session),
    )


def get_stats_service(
    session: Session = Depends(get_db_session),
    cards: CardService = Depends(get_card_service),
) -> StatsService:
    return StatsService(ReviewRepository(session), cards)


def get_mock_prompt_service(
    request: Request,
    cards: CardService = Depends(get_card_service),
    stats: StatsService = Depends(get_stats_service),
) -> MockPromptService:
    return MockPromptService(
        cards=cards, template=request.app.state.mock_template, stats=stats
    )


def get_auth_service(
    settings: Settings = Depends(get_settings),
    users: UserStore = Depends(get_user_store),
) -> AuthService:
    return build_auth_service(settings, users)


def build_auth_service(settings: Settings, users: UserStore) -> AuthService:
    """Pure constructor — used both by the request dep and by the single-user
    startup hook in `app.py`. Single source of truth for Settings → AuthService."""
    return AuthService(
        users=users,
        secret=settings.secret_key,
        token_ttl=dt.timedelta(days=settings.jwt_ttl_days),
        password_min_length=settings.password_min_length,
        is_single_user=settings.single_user,
    )


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    auth: AuthService = Depends(get_auth_service),
    users: UserStore = Depends(get_user_store),
) -> User:
    if creds is None or creds.scheme.lower() != "bearer":
        raise InvalidTokenError()
    user_id = auth.verify_token(creds.credentials)
    try:
        return users.get(user_id)
    except KeyError as e:
        raise InvalidTokenError() from e
