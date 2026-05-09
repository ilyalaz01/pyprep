"""T3.1 — Alembic baseline migration matches the ORM metadata.

If a developer changes a model without generating a follow-up revision,
`alembic check`-equivalent fails here in CI, well before runtime.
"""

from __future__ import annotations

from pathlib import Path

from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect

from alembic import command
from pyprep.sdk.repos import models as _models  # noqa: F401  # populate metadata
from pyprep.sdk.repos.database import Base

REPO_ROOT = Path(__file__).resolve().parents[2]


def _alembic_cfg(database_url: str) -> Config:
    cfg = Config(str(REPO_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(REPO_ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", database_url)
    return cfg


def test_baseline_migration_applies_and_creates_all_tables(tmp_path) -> None:
    db_path = tmp_path / "alembic_apply.db"
    url = f"sqlite:///{db_path}"
    command.upgrade(_alembic_cfg(url), "head")

    engine = create_engine(url)
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    assert {"users", "sessions", "reviews", "alembic_version"} <= tables


def test_no_pending_migration_drift(tmp_path) -> None:
    """After `upgrade head`, comparing live schema to ORM metadata must
    yield zero diffs — the equivalent of `alembic check`."""
    db_path = tmp_path / "alembic_drift.db"
    url = f"sqlite:///{db_path}"
    command.upgrade(_alembic_cfg(url), "head")

    engine = create_engine(url)
    with engine.connect() as conn:
        ctx = MigrationContext.configure(conn, opts={"render_as_batch": True})
        diffs = compare_metadata(ctx, Base.metadata)
    assert diffs == [], f"migration drifted from ORM metadata: {diffs}"
