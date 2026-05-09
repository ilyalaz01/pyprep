"""In-memory content index data classes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class Card:
    id: str
    sphere_id: str
    module_id: int
    type: str
    topic: str
    difficulty: int
    tags: tuple[str, ...]
    raw: dict[str, Any]


@dataclass(frozen=True, slots=True)
class LessonMeta:
    """Lesson YAML frontmatter, parsed once at load time.

    `title` is the human-readable label shown in the SPA H1; `sphere_id`
    is the technical address (file naming, breadcrumb). They serve
    different roles — see T4.5.2 + T4.5.1 design notes.
    """

    title: str | None = None
    title_ru: str | None = None
    estimated_minutes: int | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    prerequisites: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class SphereContent:
    sphere_id: str
    module_id: int
    cards: tuple[Card, ...]
    lesson_md: str  # body only — frontmatter has been stripped (T4.5.1)
    lesson_meta: LessonMeta | None = None  # None when lesson has no frontmatter


@dataclass(frozen=True, slots=True)
class ContentIndex:
    cards: dict[str, Card]
    spheres: dict[str, SphereContent]
    modules: dict[int, tuple[str, ...]]
