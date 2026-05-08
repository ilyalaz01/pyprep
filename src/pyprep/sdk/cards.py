"""CardService: query layer over an in-memory `ContentIndex`."""

from __future__ import annotations

from collections.abc import Iterable

from .content_loader import Card, ContentIndex


class CardNotFoundError(KeyError):
    """Raised when a card_id is not present in the index."""


class CardService:
    def __init__(self, index: ContentIndex) -> None:
        self._index = index

    def get(self, card_id: str) -> Card:
        try:
            return self._index.cards[card_id]
        except KeyError as e:
            raise CardNotFoundError(card_id) from e

    def by_sphere(self, sphere_id: str) -> list[Card]:
        sphere = self._index.spheres.get(sphere_id)
        return list(sphere.cards) if sphere else []

    def by_type(self, type: str) -> list[Card]:
        return [c for c in self._all() if c.type == type]

    def by_tag(self, tag: str) -> list[Card]:
        return [c for c in self._all() if tag in c.tags]

    def by_difficulty_range(self, min_difficulty: int, max_difficulty: int) -> list[Card]:
        return [c for c in self._all() if min_difficulty <= c.difficulty <= max_difficulty]

    def query(
        self,
        *,
        sphere_id: str | None = None,
        type: str | None = None,
        tags: Iterable[str] | None = None,
        min_difficulty: int | None = None,
        max_difficulty: int | None = None,
    ) -> list[Card]:
        cards: Iterable[Card] = self.by_sphere(sphere_id) if sphere_id else self._all()
        if type is not None:
            cards = (c for c in cards if c.type == type)
        if tags:
            wanted = tuple(tags)
            cards = (c for c in cards if all(t in c.tags for t in wanted))
        if min_difficulty is not None:
            cards = (c for c in cards if c.difficulty >= min_difficulty)
        if max_difficulty is not None:
            cards = (c for c in cards if c.difficulty <= max_difficulty)
        return list(cards)

    def _all(self) -> list[Card]:
        return list(self._index.cards.values())
