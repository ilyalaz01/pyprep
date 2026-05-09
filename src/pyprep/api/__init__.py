"""PyPrep HTTP API layer (Phase 3).

Thin FastAPI adapter over `pyprep.sdk`. Handlers are 1:1 with SDK methods —
parse Pydantic in, call SDK, format Pydantic out. No business logic here.
See PLAN §3.1, ADR-007, ADR-010, and Hard Rule 2.
"""

from .app import create_app

__all__ = ["create_app"]
