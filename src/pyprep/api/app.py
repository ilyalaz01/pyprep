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
from pyprep.sdk.shared.config import Settings

from .db import create_engine_for, create_sessionmaker
from .errors import HTTPMapping, install_error_handlers
from .lifespan import lifespan
from .log_config import configure_logging
from .middleware import RequestLoggingMiddleware
from .routers import auth as auth_router
from .routers import health as health_router

_BEARER = {"WWW-Authenticate": "Bearer"}

AUTH_ERROR_MAPPINGS: dict[type[Exception], HTTPMapping] = {
    EmailAlreadyExistsError: HTTPMapping(409, "email_exists"),
    InvalidEmailError: HTTPMapping(422, "invalid_email"),
    PasswordTooShortError: HTTPMapping(422, "password_too_short"),
    PasswordTooLongError: HTTPMapping(422, "password_too_long"),
    InvalidCredentialsError: HTTPMapping(401, "invalid_credentials", headers=_BEARER),
    InvalidTokenError: HTTPMapping(401, "invalid_token", headers=_BEARER),
    ExpiredTokenError: HTTPMapping(401, "token_expired", headers=_BEARER),
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

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["x-request-id"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    install_error_handlers(app, mappings=AUTH_ERROR_MAPPINGS)

    app.include_router(health_router.router, prefix="/api")
    app.include_router(auth_router.router, prefix="/api")

    return app


def run() -> None:
    """uvicorn entry — wired into pyproject `[project.scripts] pyprep-api`."""
    import uvicorn

    settings = Settings()  # type: ignore[call-arg]  # env-driven
    uvicorn.run(create_app(settings), host="0.0.0.0", port=8000)  # noqa: S104
