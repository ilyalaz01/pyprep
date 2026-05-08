"""MockPromptService: filter, sample, render — pure function of the request.

Card answers (`card.raw['answer']`, `card.raw['solution_code']`) are NEVER
copied into the prompt; only `topic`, `sphere_id`, and `difficulty` are
rendered. The mock interview tests memory, not recognition (PRD §3 §3).

Sampling without replacement uses the Efraimidis-Spirakis algorithm with
key = uniform()**(1/weight); top-k by key. `random.Random(seed)` makes it
deterministic — same request, same prompt.
"""

from __future__ import annotations

import random

from pyprep.sdk.cards import CardService
from pyprep.sdk.content_loader import Card
from pyprep.sdk.stats import StatsService

from .models import MockPrompt, MockPromptRequest

_WEIGHT_FLOOR = 0.01  # mastered cards still get a tiny chance under weakness_focus


class MockPromptService:
    def __init__(
        self,
        *,
        cards: CardService,
        template: str,
        stats: StatsService | None = None,
    ) -> None:
        self._cards = cards
        self._template = template
        self._stats = stats

    def generate(self, request: MockPromptRequest) -> MockPrompt:
        candidates = self._candidates(request)
        sampled = self._sample(candidates, request) if candidates else []
        return MockPrompt(
            text=self._render(sampled, request),
            cards_used=tuple(c.id for c in sampled),
            estimated_minutes=request.duration_minutes,
        )

    def _candidates(self, req: MockPromptRequest) -> list[Card]:
        pool = self._cards.query(
            min_difficulty=req.difficulty_min, max_difficulty=req.difficulty_max
        )
        out = [
            c
            for c in pool
            if (not req.modules or c.module_id in req.modules)
            and (not req.spheres or c.sphere_id in req.spheres)
        ]
        out.sort(key=lambda c: c.id)  # canonical pre-sample order
        return out

    def _sample(self, candidates: list[Card], req: MockPromptRequest) -> list[Card]:
        rng = random.Random(req.seed)  # noqa: S311 — deterministic non-crypto seed
        weights = self._weights(candidates, req)
        keyed: list[tuple[float, Card]] = []
        for c, w in zip(candidates, weights, strict=True):
            u = rng.random()
            key = u ** (1.0 / w) if w > 0 else 0.0
            keyed.append((key, c))
        keyed.sort(key=lambda x: (x[0], x[1].id), reverse=True)
        return [c for _, c in keyed[: req.count]]

    def _weights(self, candidates: list[Card], req: MockPromptRequest) -> list[float]:
        if not (req.weakness_focus and req.user_id and self._stats):
            return [1.0] * len(candidates)
        retention = {
            s.sphere_id: s.retention
            for s in self._stats.per_sphere(req.user_id)
        }
        return [(1.0 - retention.get(c.sphere_id, 0.0)) + _WEIGHT_FLOOR for c in candidates]

    def _render(self, sampled: list[Card], req: MockPromptRequest) -> str:
        topic_lines = "\n".join(
            f"- {c.topic} ({c.sphere_id}, difficulty {c.difficulty})" for c in sampled
        )
        mix = dict(req.type_mix)
        replacements = {
            "duration_minutes": str(req.duration_minutes),
            "role_label": req.role_label,
            "candidate_level": req.candidate_level,
            "language_hint": req.language_hint,
            "question_count": str(len(sampled)),
            "order_label": "fixed" if req.seed == 0 else "shuffled",
            "topic_list": topic_lines,
            "pct_concept": str(mix.get("concept", 0)),
            "pct_code_trap": str(mix.get("code_trap", 0)),
            "pct_design": str(mix.get("design", 0)),
            "pct_practical": str(mix.get("practical", 0)),
        }
        text = self._template
        for key, value in replacements.items():
            text = text.replace(f"{{{{{key}}}}}", value)
        return text
