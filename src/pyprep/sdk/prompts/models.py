"""Request / result types for MockPromptService."""

from __future__ import annotations

from dataclasses import dataclass

_DEFAULT_TYPE_MIX = (
    ("concept", 30),
    ("code_trap", 35),
    ("design", 15),
    ("practical", 20),
)


@dataclass(frozen=True, slots=True)
class MockPromptRequest:
    user_id: str | None = None
    modules: tuple[int, ...] = ()
    spheres: tuple[str, ...] = ()
    difficulty_min: int = 1
    difficulty_max: int = 5
    count: int = 10
    duration_minutes: int = 30
    role_label: str = "Junior Python Developer (Student Position)"
    candidate_level: str = "junior"
    weakness_focus: bool = False
    seed: int = 0
    language_hint: str = "English / Hebrew / Russian"
    type_mix: tuple[tuple[str, int], ...] = _DEFAULT_TYPE_MIX


@dataclass(frozen=True, slots=True)
class MockPrompt:
    text: str
    cards_used: tuple[str, ...]
    estimated_minutes: int
