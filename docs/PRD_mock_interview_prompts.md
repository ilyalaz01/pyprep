# PRD — Mock Interview Prompt Generator

> **DEPRECATED — Historical artifact only.** Mock Interview Generator was removed from the roadmap on 2026-05-13 (see `PLAN.md` ADR-028). The feature had no product traction during Phase 5–7 and the Phase 8/9 slots originally reserved for it were reclaimed for Module 2–4 content authoring, which directly ships product value. `MockPromptService` (built in T2.6) remains in the SDK as dormant code. ADR-005 (prompt generator vs in-app LLM call) is retained as the original design rationale; it is not withdrawn, because the architecture would still be correct if this feature is ever revived. **Do not implement against this PRD without first amending or superseding ADR-028.**

**Component:** `src/pyprep/sdk/prompts/`
**Decision:** This feature does **not** call any LLM API. It generates a text prompt the user pastes into their own LLM (Claude.ai / ChatGPT). See `PLAN.md` ADR-005.

---

## 1. Why this design

- Per-token API cost is significant for an unmonetized tool.
- The user already pays for a chat-LLM subscription.
- The quality of the mock interview comes 80% from the prompt and 20% from the model. A great prompt + GPT-4 / Claude 4.7 in the user's own browser tab outperforms a mediocre prompt + a paid backend call.
- This decision keeps the platform free, eliminates rate-limit code, and removes a class of production failure modes.

---

## 2. Functional Requirements

- **FR-MOCK-1:** Given a filter (modules, spheres, difficulty band, count, language), produce a deterministic prompt.
- **FR-MOCK-2:** Sample N cards matching the filter, weighted by user's weakness if `weakness_focus=true`.
- **FR-MOCK-3:** Render the prompt from a template that includes:
  - Persona (senior interviewer at an Israeli mid/junior hi-tech company).
  - Behavior (one question at a time, demand verbal explanation, push on shallow answers, never reveal the answer until the user says "I give up" or attempts honestly).
  - Topic list (the sampled cards' topics, NOT the answers).
  - Wrap-up (after N questions, give an honest debrief: strong areas, weak areas, suggested next focus).
- **FR-MOCK-4:** Provide a "Copy to clipboard" button and a "How to use" panel.
- **FR-MOCK-5:** Provide 5 pre-curated packs (e.g., "Junior Backend — Python Core", "QA Automation — Testing Heavy") in addition to custom filtering.
- **FR-MOCK-6:** Same input → same output. A `seed` parameter randomizes question order while keeping content stable.

---

## 3. Prompt Template (v1)

Stored in `content/interview_packs/template_v1.md`. Used by `MockPromptService` with `{{...}}` placeholders.

```text
You are a senior software engineer at an Israeli hi-tech company conducting
a {{duration_minutes}}-minute technical screen for a {{role_label}} position.
The candidate is a {{candidate_level}} Python developer.

INTERVIEW RULES
- Ask ONE question at a time. Wait for the candidate's response before continuing.
- The candidate may answer in English, Hebrew, or Russian; you respond in the
  same language they use.
- After each answer, briefly evaluate it (1–2 sentences) on a scale: weak / partial / solid / strong.
- If an answer is weak or partial, ask ONE concise follow-up to probe deeper before moving on.
- Do NOT reveal the canonical answer unless the candidate explicitly says
  "I give up on this one" or after their second attempt is also wrong.
- Track the candidate's strengths and weaknesses internally as you go.

TOPICS TO COVER (in order; you may skip up to 2 if running long)
{{#topics}}
- {{topic}} ({{module}} → {{sphere}}, difficulty {{difficulty}})
{{/topics}}

QUESTION TYPES TO MIX
- ~{{pct_concept}}% conceptual ("explain X")
- ~{{pct_code_trap}}% code traps ("what does this print?")
- ~{{pct_design}}% small-design ("how would you structure X?")
- ~{{pct_practical}}% practical scenarios ("how would you debug Y?")

INTERVIEWER PERSONA
- Direct but respectful. No filler praise. No "great question!".
- Pushes on hand-wavy answers. Accepts "I don't know" honestly.
- Calls out specific terms the candidate misuses.

WRAP-UP (after {{question_count}} questions OR when the candidate signals end)
Give an honest debrief in this format:

  Strong areas: ...
  Partial areas: ...
  Weak areas: ...
  Recommended focus next: ...
  Likely outcome of a real screen at this level: pass / borderline / fail

Begin with a short greeting, ask the candidate to confirm they are ready,
then ask the first question.
```

---

## 4. Sampling Algorithm

```
INPUT: filter = (modules, spheres, difficulty_min, difficulty_max, count, weakness_focus, seed, user_id)

candidates ← all cards matching modules & spheres & difficulty band
IF weakness_focus AND user_id:
    weights[card] ← (1 - retention_of_card.sphere)
ELSE:
    weights[card] ← uniform

selected ← weighted_sample_without_replacement(candidates, count, weights, seed)

shuffle(selected, seed)
```

Output is a stable list of card IDs the prompt will reference by topic (never by answer text).

---

## 5. Public Interface

```python
# src/pyprep/sdk/prompts/__init__.py

class MockPromptService:
    def __init__(self, content_loader: ContentLoader, stats: StatsService | None = None):
        ...

    def generate(self, request: MockPromptRequest) -> MockPrompt:
        """Pure: same request → same prompt (modulo seed)."""

@dataclass
class MockPromptRequest:
    user_id: str | None
    modules: list[int]
    spheres: list[str]
    difficulty_min: int = 1
    difficulty_max: int = 5
    count: int = 10
    duration_minutes: int = 30
    role_label: str = "Junior Python Developer (Student Position)"
    candidate_level: str = "junior"
    weakness_focus: bool = False
    seed: int = 0
    language_hint: str = "English / Hebrew / Russian"

@dataclass
class MockPrompt:
    text: str                  # the full prompt string
    cards_used: list[str]      # card IDs included
    estimated_minutes: int
```

---

## 6. Pre-curated Packs

Defined in `content/interview_packs/packs.json`. Each pack is a saved `MockPromptRequest`.

Initial packs:

1. **Junior Backend — Python Core** (Modules 1, 2, 3 mixed, count=10, 30 min)
2. **QA Automation Heavy** (Module 3 + parts of 2, count=10, 30 min, code-trap weighted)
3. **Junior Python — Mixed** (all modules, weakness-focus, count=12, 45 min)
4. **Refresh — Quick 15** (count=5, 15 min, easy band only)
5. **Pre-onsite Drill** (count=15, 60 min, hard band, no weakness focus)

---

## 7. Acceptance Criteria

- [ ] `generate(request)` is a pure function (same args → same output).
- [ ] Snapshot tests pin the v1 prompt format.
- [ ] All 5 pre-curated packs return non-empty prompts.
- [ ] No file in `prompts/` exceeds 150 LOC.
- [ ] Owner runs ≥ 3 real mock interviews using generated prompts and reports usable feedback (template iteration logged in this file under §8).

---

## 8. Iteration Log

| Date | Trigger | Change | Outcome |
|---|---|---|---|
| _empty_ | _to be filled by owner after first 3 mock interviews_ | | |
