"""/api/health — CI smoke endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy import text

from pyprep import __version__

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    version: str
    db_ok: bool


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    engine = request.app.state.engine
    db_ok = False
    try:
        with engine.connect() as conn:
            db_ok = conn.execute(text("SELECT 1")).scalar() == 1
    except Exception:  # health is a canary, not a gate
        db_ok = False
    return HealthResponse(status="ok", version=__version__, db_ok=db_ok)
