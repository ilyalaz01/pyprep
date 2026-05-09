"""POST /api/mock/prompt — generate a deterministic mock-interview prompt."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from pyprep.api.deps import get_current_user, get_mock_prompt_service
from pyprep.sdk.auth import User
from pyprep.sdk.prompts import MockPromptRequest, MockPromptService

router = APIRouter(prefix="/mock", tags=["mock"])


class MockPromptBody(BaseModel):
    modules: list[int] = []
    spheres: list[str] = []
    difficulty_min: int = Field(default=1, ge=1, le=5)
    difficulty_max: int = Field(default=5, ge=1, le=5)
    count: int = Field(default=10, ge=1, le=50)
    duration_minutes: int = Field(default=30, ge=5, le=180)
    weakness_focus: bool = False
    seed: int = 0


class MockPromptResponse(BaseModel):
    text: str
    cards_used: list[str]
    estimated_minutes: int


@router.post("/prompt", response_model=MockPromptResponse)
def generate(
    body: MockPromptBody,
    user: User = Depends(get_current_user),
    svc: MockPromptService = Depends(get_mock_prompt_service),
) -> MockPromptResponse:
    req = MockPromptRequest(
        user_id=user.id,
        modules=tuple(body.modules),
        spheres=tuple(body.spheres),
        difficulty_min=body.difficulty_min,
        difficulty_max=body.difficulty_max,
        count=body.count,
        duration_minutes=body.duration_minutes,
        weakness_focus=body.weakness_focus,
        seed=body.seed,
    )
    p = svc.generate(req)
    return MockPromptResponse(
        text=p.text, cards_used=list(p.cards_used), estimated_minutes=p.estimated_minutes
    )
