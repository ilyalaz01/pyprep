"""/api/config — public boot-time deployment-mode probe (ADR-014).

Single, intentionally-tiny endpoint. The SPA fetches this once at boot
to decide between login screen and single-user auto-attempt. Anything
added here is observable to anonymous callers and must stay public-safe
forever — per-user config goes through `/api/auth/me` (auth-gated),
NOT here.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from pyprep import __version__
from pyprep.api.deps import get_settings
from pyprep.sdk.shared.config import Settings

router = APIRouter(prefix="/config", tags=["config"])


class ConfigResponse(BaseModel):
    single_user: bool
    version: str
    # ADR-014: populated only in single-user mode (no enumeration surface
    # there — exactly one possible user). Null in multi-user deployments.
    single_user_email: str | None


@router.get("", response_model=ConfigResponse)
def get_config(settings: Settings = Depends(get_settings)) -> ConfigResponse:
    return ConfigResponse(
        single_user=settings.single_user,
        version=__version__,
        single_user_email=settings.single_user_email if settings.single_user else None,
    )
