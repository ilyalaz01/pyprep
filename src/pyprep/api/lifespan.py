"""App lifespan — runs on startup/shutdown.

Today's only job: in single-user deployments, idempotently auto-create the
owner account. Lives in its own module so `app.py` stays a thin factory.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from pyprep.sdk.auth import EmailAlreadyExistsError
from pyprep.sdk.repos.users import UserRepository
from pyprep.sdk.shared.config import Settings

from .deps import build_auth_service

_log = structlog.get_logger("pyprep.api.lifespan")


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    settings: Settings = app.state.settings
    if settings.single_user:
        _ensure_single_user(app, settings)
    yield


def _ensure_single_user(app: FastAPI, settings: Settings) -> None:
    if settings.single_user_password is None:
        # Settings model_validator already enforces this; defensive belt.
        return
    sm = app.state.sessionmaker
    with sm() as session:
        users = UserRepository(session)
        if users.get_by_email(settings.single_user_email) is not None:
            _log.info("single_user.existing", email=settings.single_user_email)
            return
        auth = build_auth_service(settings, users)
        try:
            auth.register(
                settings.single_user_email,
                settings.single_user_password.get_secret_value(),
            )
            session.commit()
            _log.info("single_user.created", email=settings.single_user_email)
        except EmailAlreadyExistsError:
            # Race between two boots; log and move on.
            session.rollback()
            _log.info("single_user.race_skipped", email=settings.single_user_email)
