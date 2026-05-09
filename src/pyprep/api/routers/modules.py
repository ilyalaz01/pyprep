"""/api/modules — list modules, fetch module detail and lessons.

Reads from `app.state.content_index` (loaded once in `create_app`).
Public endpoints — no auth required; content is non-secret.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from pyprep.api.deps import get_content_index
from pyprep.sdk.content_loader import ContentIndex

router = APIRouter(prefix="/modules", tags=["modules"])


class ModuleSummary(BaseModel):
    module_id: int
    sphere_ids: list[str]


class ModulesResponse(BaseModel):
    modules: list[ModuleSummary]


class SphereSummary(BaseModel):
    sphere_id: str
    card_count: int
    lesson_present: bool


class ModuleDetail(BaseModel):
    module_id: int
    sphere_ids: list[str]
    spheres: list[SphereSummary]


class LessonResponse(BaseModel):
    sphere_id: str
    module_id: int
    lesson_md: str
    card_count: int


@router.get("", response_model=ModulesResponse)
def list_modules(index: ContentIndex = Depends(get_content_index)) -> ModulesResponse:
    return ModulesResponse(
        modules=[
            ModuleSummary(module_id=m, sphere_ids=list(ids))
            for m, ids in sorted(index.modules.items())
        ]
    )


@router.get("/{module_id}", response_model=ModuleDetail)
def get_module(
    module_id: int, index: ContentIndex = Depends(get_content_index)
) -> ModuleDetail:
    sphere_ids = index.modules.get(module_id)
    if sphere_ids is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="module not found")
    spheres = [_to_sphere_summary(index, sid) for sid in sphere_ids]
    return ModuleDetail(module_id=module_id, sphere_ids=list(sphere_ids), spheres=spheres)


@router.get("/{module_id}/lesson/{sphere_id}", response_model=LessonResponse)
def get_lesson(
    module_id: int,
    sphere_id: str,
    index: ContentIndex = Depends(get_content_index),
) -> LessonResponse:
    sphere = index.spheres.get(sphere_id)
    if sphere is None or sphere.module_id != module_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="lesson not found")
    return LessonResponse(
        sphere_id=sphere_id,
        module_id=module_id,
        lesson_md=sphere.lesson_md,
        card_count=len(sphere.cards),
    )


def _to_sphere_summary(index: ContentIndex, sphere_id: str) -> SphereSummary:
    sphere = index.spheres[sphere_id]
    return SphereSummary(
        sphere_id=sphere_id,
        card_count=len(sphere.cards),
        lesson_present=bool(sphere.lesson_md),
    )
