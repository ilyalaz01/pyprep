"""In-memory content index data classes."""

from __future__ import annotations

from dataclasses import dataclass
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
class SphereContent:
    sphere_id: str
    module_id: int
    cards: tuple[Card, ...]
    lesson_md: str


@dataclass(frozen=True, slots=True)
class ContentIndex:
    cards: dict[str, Card]
    spheres: dict[str, SphereContent]
    modules: dict[int, tuple[str, ...]]
