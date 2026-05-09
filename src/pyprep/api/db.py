"""Engine + sessionmaker factory.

PRAGMA foreign_keys=ON is attached as a per-engine `connect` listener so it
fires on **every** new DBAPI connection from the pool, not just the first
(PLAN §5 ON DELETE CASCADE only takes effect under this pragma on SQLite).
Postgres enforces FKs unconditionally — the listener no-ops for non-sqlite.
"""

from __future__ import annotations

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from pyprep.sdk.shared.config import Settings


def create_engine_for(settings: Settings) -> Engine:
    from sqlalchemy import create_engine

    connect_args: dict[str, object] = {}
    is_sqlite = settings.database_url.startswith("sqlite")
    if is_sqlite:
        # FastAPI uses a single-threaded sync handler per request, but the
        # default-pool worker may bounce across threads — disable the check.
        connect_args["check_same_thread"] = False

    engine = create_engine(settings.database_url, connect_args=connect_args, future=True)

    if is_sqlite:
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, _record):  # type: ignore[no-untyped-def]
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def create_sessionmaker(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
