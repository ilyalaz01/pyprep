"""ContentLoader: validate content/ tree and build an in-memory index."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

import jsonschema

from .index import Card, ContentIndex, SphereContent

_DEFAULT_SCHEMA = "schema/card.schema.json"
_MODULES_DIR = "modules"


class ContentLoaderError(Exception):
    """Raised when content fails to load or validate."""


class ContentLoader:
    def __init__(self, root: Path | str, *, schema_path: Path | str | None = None) -> None:
        self._root = Path(root)
        self._schema_path = Path(schema_path) if schema_path else self._root / _DEFAULT_SCHEMA

    def load(self) -> ContentIndex:
        schema = json.loads(self._schema_path.read_text("utf-8"))
        wrappers = self._read_wrappers()
        spheres = self._build_spheres(wrappers, schema)
        cards = _index_cards_unique(spheres)
        modules = _index_modules(spheres)
        return ContentIndex(cards=cards, spheres=spheres, modules=modules)

    def _read_wrappers(self) -> list[tuple[Path, dict[str, Any]]]:
        files = sorted((self._root / _MODULES_DIR).rglob("*.cards.json"))
        return [(p, json.loads(p.read_text("utf-8"))) for p in files]

    def _build_spheres(
        self,
        wrappers: list[tuple[Path, dict[str, Any]]],
        schema: dict[str, Any],
    ) -> dict[str, SphereContent]:
        out: dict[str, SphereContent] = {}
        for path, wrapper in wrappers:
            sphere_id = wrapper.get("sphere_id")
            module_id = wrapper.get("module_id")
            if not isinstance(sphere_id, str):
                raise ContentLoaderError(f"{path.name}: wrapper missing sphere_id")
            if not isinstance(module_id, int):
                raise ContentLoaderError(f"{path.name}: wrapper missing module_id")
            cards = tuple(
                _build_card(c, sphere_id, module_id, path, schema)
                for c in wrapper.get("cards", [])
            )
            out[sphere_id] = SphereContent(
                sphere_id=sphere_id,
                module_id=module_id,
                cards=cards,
                lesson_md=_read_lesson(path),
            )
        return out


def _build_card(
    raw: dict[str, Any],
    sphere_id: str,
    module_id: int,
    path: Path,
    schema: dict[str, Any],
) -> Card:
    try:
        jsonschema.validate(raw, schema)
    except jsonschema.ValidationError as e:
        cid = raw.get("id", "?")
        raise ContentLoaderError(f"{path.name}:{cid}: schema: {e.message}") from e
    return Card(
        id=raw["id"],
        sphere_id=sphere_id,
        module_id=module_id,
        type=raw["type"],
        topic=raw["topic"],
        difficulty=raw["difficulty"],
        tags=tuple(raw["tags"]),
        raw=raw,
    )


def _read_lesson(cards_path: Path) -> str:
    stem = cards_path.name.removesuffix(".cards.json")
    lesson_path = cards_path.with_name(f"{stem}.md")
    return lesson_path.read_text("utf-8") if lesson_path.exists() else ""


def _index_cards_unique(spheres: dict[str, SphereContent]) -> dict[str, Card]:
    all_cards = [c for s in spheres.values() for c in s.cards]
    out: dict[str, Card] = {}
    for card in all_cards:
        if card.id in out:
            raise ContentLoaderError(f"duplicate card id: {card.id}")
        out[card.id] = card
    return out


def _index_modules(spheres: dict[str, SphereContent]) -> dict[int, tuple[str, ...]]:
    by_module: dict[int, list[str]] = defaultdict(list)
    for sphere in spheres.values():
        by_module[sphere.module_id].append(sphere.sphere_id)
    return {m: tuple(sorted(ids)) for m, ids in by_module.items()}
