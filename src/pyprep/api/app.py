"""FastAPI application factory + uvicorn entry point.

`create_app(settings)` is the only construction path — tests, scripts, and
the `pyprep-api` CLI all flow through it. Returns a fully wired app with
CORS, structured request logging, centralized SDK→HTTP error mapping, the
SQLite FK pragma listener, the single-user lifespan hook, and all routers
mounted under `/api`.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pyprep import __version__
from pyprep.sdk.auth import (
    EmailAlreadyExistsError,
    ExpiredTokenError,
    InvalidCredentialsError,
    InvalidEmailError,
    InvalidTokenError,
    PasswordTooLongError,
    PasswordTooShortError,
)
from pyprep.sdk.cards import CardNotFoundError
from pyprep.sdk.content_loader import ContentLoader
from pyprep.sdk.sessions import SessionFinishedError
from pyprep.sdk.shared.config import Settings

from .db import create_engine_for, create_sessionmaker
from .errors import HTTPMapping, install_error_handlers
from .lifespan import lifespan
from .log_config import configure_logging
from .middleware import AuthNoStoreMiddleware, RequestLoggingMiddleware
from .routers import auth as auth_router
from .routers import health as health_router
from .routers import mock as mock_router
from .routers import modules as modules_router
from .routers import review as review_router
from .routers import sessions as sessions_router
from .routers import stats as stats_router

_BEARER = {"WWW-Authenticate": "Bearer"}
_TEMPLATE_REL = "interview_packs/template_v1.md"


def _load_mock_template(content_root) -> str:  # type: ignore[no-untyped-def]
    """Extract the first ```text ...``` codeblock from template_v1.md.
    The wrapping markdown is human documentation; the codeblock is the
    actual prompt template MockPromptService consumes."""
    md = (content_root / _TEMPLATE_REL).read_text("utf-8")
    out: list[str] = []
    in_block = False
    for line in md.splitlines():
        if line.strip() == "```text":
            in_block = True
            continue
        if in_block and line.strip() == "```":
            break
        if in_block:
            out.append(line)
    return "\n".join(out)

AUTH_ERROR_MAPPINGS: dict[type[Exception], HTTPMapping] = {
    EmailAlreadyExistsError: HTTPMapping(409, "email_exists"),
    InvalidEmailError: HTTPMapping(422, "invalid_email"),
    PasswordTooShortError: HTTPMapping(422, "password_too_short"),
    PasswordTooLongError: HTTPMapping(422, "password_too_long"),
    InvalidCredentialsError: HTTPMapping(401, "invalid_credentials", headers=_BEARER),
    InvalidTokenError: HTTPMapping(401, "invalid_token", headers=_BEARER),
    ExpiredTokenError: HTTPMapping(401, "token_expired", headers=_BEARER),
}

SESSION_ERROR_MAPPINGS: dict[type[Exception], HTTPMapping] = {
    CardNotFoundError: HTTPMapping(404, "card_not_found"),
    SessionFinishedError: HTTPMapping(409, "session_finished"),
}


def create_app(settings: Settings) -> FastAPI:
    configure_logging(settings.log_level)

    app = FastAPI(
        title="PyPrep API",
        version=__version__,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url="/api/redoc",
        lifespan=lifespan,
    )

    engine = create_engine_for(settings)
    app.state.settings = settings
    app.state.engine = engine
    app.state.sessionmaker = create_sessionmaker(engine)
    app.state.content_index = ContentLoader(settings.content_root).load()
    app.state.mock_template = _load_mock_template(settings.content_root)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["x-request-id"],
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(AuthNoStoreMiddleware)

    install_error_handlers(app, mappings={**AUTH_ERROR_MAPPINGS, **SESSION_ERROR_MAPPINGS})

    app.include_router(health_router.router, prefix="/api")
    app.include_router(auth_router.router, prefix="/api")
    app.include_router(modules_router.router, prefix="/api")
    app.include_router(review_router.router, prefix="/api")
    app.include_router(sessions_router.router, prefix="/api")
    app.include_router(stats_router.router, prefix="/api")
    app.include_router(mock_router.router, prefix="/api")

    return app


def run() -> None:
    """uvicorn entry — wired into pyproject `[project.scripts] pyprep-api`."""
    import uvicorn

    settings = Settings()  # type: ignore[call-arg]  # env-driven
    uvicorn.run(create_app(settings), host="0.0.0.0", port=8000)  # noqa: S104
