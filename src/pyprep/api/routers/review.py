"""/api/review — daily FSRS review queue (preview, not session-creating)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from pyprep.api.deps import get_current_user, get_session_service, get_settings
from pyprep.sdk.auth import User
from pyprep.sdk.sessions import SessionService
from pyprep.sdk.shared.config import Settings

router = APIRouter(prefix="/review", tags=["review"])


class ReviewQueueResponse(BaseModel):
    card_ids: list[str]
    sphere_id: str | None = None


@router.get("/queue", response_model=ReviewQueueResponse)
def get_queue(
    sphere_id: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    sessions: SessionService = Depends(get_session_service),
    settings: Settings = Depends(get_settings),
) -> ReviewQueueResponse:
    queue = sessions.preview_queue(
        user_id=user.id,
        mode="review",
        sphere_id=sphere_id,
        limit=limit,
        daily_new_card_cap=settings.daily_new_card_cap,
    )
    return ReviewQueueResponse(card_ids=list(queue), sphere_id=sphere_id)
