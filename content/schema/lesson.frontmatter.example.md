# Lesson frontmatter — locked example

Every lesson file `content/modules/<NN>_<slug>/<SS>_<sphere_slug>.md`
MUST start with the YAML frontmatter block below. Field types and
required-ness are pinned here. The validator (T1.10) checks each
lesson's frontmatter against this contract.

For the human-readable rationale and lesson-body rules
(≤ 700 words, runnable CPython 3.11 code, no external images), see
`docs/PRD_content_authoring.md` §4.

---

## The locked block

```markdown
---
module_id: 1                                   # integer ≥ 1, matches the module dir number
sphere_id: "m1-s0"                             # string, format ^m\d+-s\d+$, matches the file
title: "Foundations & Hidden Python Traps"    # string, English, ≤ 100 chars
title_ru: "Фундамент и скрытые ловушки Python" # OPTIONAL string, Russian; omit when untranslated
estimated_minutes: 12                          # integer, 5..60 — honest reading time
prerequisites: []                              # array of sphere_id strings (e.g. ["m1-s0"])
tags: ["python-core", "gotchas"]              # non-empty array of slug-style strings
---
```

## Field reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `module_id` | integer | yes | Must match the parent directory's `NN`. |
| `sphere_id` | string | yes | Must match the file's `<SS>` and exist in `content/curriculum.md`. |
| `title` | string | yes | English. ≤ 100 chars. Becomes the `<h1>` of the lesson view. |
| `title_ru` | string | no | Russian translation. Omit if not yet translated; do **not** ship a placeholder. |
| `estimated_minutes` | integer | yes | Realistic reading time. Authors honest, learners trust the number. |
| `prerequisites` | array of `sphere_id` | yes (may be empty) | Lessons the reader should finish first. |
| `tags` | array of strings | yes | At least one tag. Slug-style (lowercase, hyphenated). Used by stats. |

## What follows the frontmatter

The body is plain Markdown:

```markdown
# <repeat the title>

(short intro paragraph in plain English, ≤ 3 sentences)

## Why this matters in interviews

(2–4 sentences explaining what the interviewer is *actually* probing)

## Concept 1 — <name>

…
```

Body rules (binding):

- Total lesson length ≤ 700 words (excluding code blocks).
- All code examples runnable as-is in CPython 3.11. No pseudocode.
- No external images at MVP. Inline ASCII / tables only.
- End with a `## Practice cards` section pointing readers at the
  cards for this sphere.
