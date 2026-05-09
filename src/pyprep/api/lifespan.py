"""App lifespan — runs on startup/shutdown.

Two startup jobs (in order):
  1. Run alembic migrations to head — idempotent, no-op when DB is current.
     Was previously NOT wired in production (audit Section D #2): tests
     used `Base.metadata.create_all` via conftest, so the gap only
     surfaced at first boot against an empty DB ("no such table: users").
  2. In single-user deployments, idempotently auto-create the owner.

Lives in its own module so `app.py` stays a thin factory.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

import structlog
from alembic.config import Config
from fastapi import FastAPI

from alembic import command
from pyprep.sdk.auth import EmailAlreadyExistsError
from pyprep.sdk.repos.users import UserRepository
from pyprep.sdk.shared.config import Settings

from .deps import build_auth_service

_log = structlog.get_logger("pyprep.api.lifespan")

# src/pyprep/api/lifespan.py → parents[3] = project root (where alembic.ini lives)
_REPO_ROOT = Path(__file__).resolve().parents[3]


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    settings: Settings = app.state.settings
    _run_migrations(settings)
    if settings.single_user:
        _ensure_single_user(app, settings)
    yield


def _run_migrations(settings: Settings) -> None:
    """Run `alembic upgrade head` against `settings.database_url`.
    Idempotent: no-op when the DB is already at head."""
    cfg = Config(str(_REPO_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(_REPO_ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    command.upgrade(cfg, "head")
    _log.info("migrations.upgraded", database_url=_redact(settings.database_url))


def _redact(url: str) -> str:
    """Strip credentials from a database URL before logging."""
    if "@" not in url:
        return url
    scheme, _, rest = url.partition("://")
    _, _, host = rest.partition("@")
    return f"{scheme}://***@{host}"


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
