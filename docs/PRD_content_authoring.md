# PRD — Content Authoring & Schema

**Component:** `content/`
**Authority:** This is the single source of truth for how lessons and cards are structured, validated, and authored. AI-generated content MUST conform to this spec exactly.

---

## 1. Why this document exists

The platform is only as good as its content. Without a strict schema and authoring rules:

- AI-generated cards drift in tone, difficulty, format.
- Validation cannot catch errors.
- The frontend cannot render reliably.
- Spaced repetition gets fed garbage signals.

This PRD pins the contract.

---

## 2. Directory Layout

```
content/
├── schema/
│   ├── card.schema.json
│   ├── lesson.frontmatter.example.md
│   └── pack.schema.json
├── modules/
│   └── <NN>_<slug>/
│       ├── module.md                       # Module overview + sphere index
│       ├── <SS>_<sphere_slug>.md           # Lesson per sphere (Markdown)
│       └── <SS>_<sphere_slug>.cards.json   # Cards for that sphere
├── interview_packs/
│   ├── template_v1.md
│   └── packs.json
└── curriculum.md                           # The flat source of all topic IDs
```

`NN` = two-digit module number (e.g., `01`, `02`). `SS` = two-digit sphere number.

---

## 3. ID Scheme

Every card has a stable, unique ID:

```
m{module}-s{sphere}-c{seq}
e.g. m1-s0-c1, m1-s0-c2, ..., m4-s5-c12
```

Once assigned, an ID **never** changes. Removing a card means tombstoning, not renumbering, to preserve learner history.

---

## 4. Lesson Markdown Format

Each `<SS>_<sphere_slug>.md` starts with frontmatter:

```markdown
---
module_id: 1
sphere_id: "m1-s0"
title: "Foundations & Hidden Python Traps"
title_ru: "Фундамент и скрытые ловушки Python"
estimated_minutes: 12
prerequisites: []
tags: ["python-core", "gotchas"]
---

# Foundations & Hidden Python Traps

(short intro paragraph in plain English, ≤ 3 sentences)

## Why this matters in interviews

(2–4 sentences explaining what the interviewer is *actually* probing)

## Concept 1 — Mutable defaults

(prose explanation, with code blocks)

```python
def add_item(item, items=[]):       # ⚠️  trap
    items.append(item)
    return items
```

(explanation of *why* this happens — function objects hold the default)

## Concept 2 — ...

...

## Practice cards

After reading this, run the cards for this sphere — the platform tracks
which ones gave you trouble and re-surfaces them.
```

### Rules
- ≤ 700 words per lesson.
- All code examples MUST be runnable as-is in plain CPython 3.11.
- Bilingual title (`title` English, `title_ru` Russian) — UI picks based on user pref. If untranslated, omit `title_ru`.
- No external images at MVP.

---

## 5. Card JSON Schema

`content/schema/card.schema.json` (excerpt):

```json
{
  "$id": "https://pyprep.local/schemas/card.schema.json",
  "type": "object",
  "required": ["id", "module_id", "sphere_id", "type", "topic", "difficulty", "tags"],
  "oneOf": [
    {"$ref": "#/$defs/flip"},
    {"$ref": "#/$defs/code_trap"},
    {"$ref": "#/$defs/multiple_choice"},
    {"$ref": "#/$defs/fill_in"},
    {"$ref": "#/$defs/code_task"}
  ],
  "$defs": {
    "common": {
      "type": "object",
      "properties": {
        "id":         { "type": "string", "pattern": "^m\\d+-s\\d+-c\\d+$" },
        "module_id":  { "type": "integer" },
        "sphere_id":  { "type": "string" },
        "topic":      { "type": "string", "maxLength": 120 },
        "topic_ru":   { "type": "string", "maxLength": 160 },
        "difficulty": { "type": "integer", "minimum": 1, "maximum": 5 },
        "tags":       { "type": "array",   "items": { "type": "string" } },
        "source":     { "type": "string" }
      }
    }
  }
}
```

Each variant adds:

| Type | Required extra fields |
|---|---|
| `flip` | `question`, `answer`, `answer_explanation_md` |
| `code_trap` | `code_snippet`, `question`, `options[]` (4), `correct_index`, `explanation_md` |
| `multiple_choice` | `question`, `options[]` (4), `correct_index`, `option_explanations[]` |
| `fill_in` | `code_snippet_with_blanks`, `accepted_answers[]` (regex array per blank) |
| `code_task` | `prompt_md`, `starter_code`, `solution_code`, `tests`, `allowlist[]` |

---

## 6. Authoring Rules (binding for AI generation)

When asking an AI agent (Claude Code or otherwise) to generate cards, the following rules MUST be in the prompt:

### Style

1. **Question wording must mirror real interviews.** Not "Define mutability" but "What does this code print, and why?" — concrete, verbal-answerable.
2. **One concept per card.** Multi-concept questions become two cards.
3. **No trick questions** that hinge on Python language version > 3.11 features unless the card is explicitly tagged `version-specific`.
4. **Distractor quality** for multiple choice / code traps: at least 2 of 4 options must be plausibly *wrong-for-an-interesting-reason* (e.g., `[1]`, `[1, 1]`, `TypeError`, `[1] (because shared default!)`). No throwaway nonsense options.
5. **Explanations must answer "why".** Not just "the answer is X" — explain the underlying mechanism.

### Coverage

For each sub-task in `curriculum.md`:
- Minimum **3 cards** total.
- Difficulty distribution: at least one card at level 1–2 (intro), one at 3 (typical), one at 4–5 (interview-grade).
- Mix of types where applicable.

### Forbidden

- Stack Overflow copy-paste. All examples must be authored fresh.
- Vendor-specific or library-specific content beyond `pytest`, `requests`, `pathlib`, `pydantic`, `fastapi` (these are in the curriculum already).
- Cards that test memorization of error message wording verbatim — test mechanism understanding instead.

---

## 7. Validation

`scripts/validate_content.py` (run in CI):

1. JSON schema check on every `.cards.json`.
2. ID uniqueness across the whole `content/` tree.
3. `sphere_id` referenced in cards exists in `curriculum.md`.
4. Min 3 cards per sub-task.
5. Difficulty distribution check (at least one card per difficulty band).
6. For `code_task`: `solution_code` actually passes `tests` (executed via Pyodide-equivalent locally — `pytest` in subprocess).
7. Markdown lessons have valid frontmatter.

CI fails on any violation.

---

## 8. Module 1 is the gold sample

Module 1 is hand-authored (or AI-generated and hand-reviewed) and serves as the calibration reference. All future modules are evaluated against its tone, depth, and difficulty distribution.

---

## 9. Acceptance Criteria for the Authoring System

- [ ] Schemas committed in `content/schema/`.
- [ ] Validator implemented and CI-enforced.
- [ ] Module 1 fully populated and validator-green.
- [ ] Authoring prompt for AI generation (see `docs/CLAUDE_CODE_INSTRUCTIONS.md`) cites this PRD by reference.
