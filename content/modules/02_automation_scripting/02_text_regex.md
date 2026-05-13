---
module_id: 2
sphere_id: "m2-s2"
title: "Text & Regex"
title_ru: "Текст и регулярные выражения"
estimated_minutes: 14
prerequisites: []
tags: ["regex", "re-module", "string-methods", "named-groups", "interview-heavy"]
---

# Text & Regex

About a third of automation-engineer interview tasks come down to "parse this text and extract that piece." Log lines, config files, output of shell commands — the data is rarely already shaped the way you need it. Regex fluency is the separator.

## Why this matters in interviews

The interviewer is checking two things: whether you reach for regex when regex is the right answer, and whether you reach for string methods when regex is overkill. Both errors get marked. Regexing `s.startswith("#")` is showing off; hand-splitting `2026-05-13 14:30:00 ERROR backend: connection refused` instead of writing one named-group pattern wastes interview time.

---

## Concept 1 — String methods first

Before regex, ask whether plain string methods do the job:

```python
for line in text.splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    process(line)
```

The pieces:

- `s.splitlines()` handles `\n`, `\r\n`, and `\r` uniformly — preferred over `s.split("\n")`.
- `s.strip()` (and `.lstrip()` / `.rstrip()`) take an optional chars argument: `s.strip(" \t,")` removes any of those from the ends.
- `s.startswith(prefix)` and `s.endswith(suffix)` accept a *tuple* for multiple options: `name.endswith((".py", ".pyi"))`.
- `sep.join(iterable)` — separator is the receiver: `", ".join(parts)`.

Fixed prefixes, joining, splitting on a known delimiter — string methods. Reach for `re` only when the pattern needs alternation, repetition, or capture.

---

## Concept 2 — `search` vs `match` vs `findall` vs `finditer`

Four entry points, four jobs:

```python
re.search(pat, s)    # first match anywhere in s         → Match | None
re.match(pat, s)     # match anchored at start of s       → Match | None
re.fullmatch(pat, s) # match must cover the entire s      → Match | None
re.findall(pat, s)   # all non-overlapping matches        → list[str] (or list[tuple] if groups)
re.finditer(pat, s)  # all matches as Match objects       → iterator of Match
```

The `match` vs `search` distinction is the most common interview trap: `re.match(r"ERROR", "log: ERROR found")` returns `None` because `match` anchors at position 0. Use `re.search` when "anywhere in the string" is what you want.

When you need groups, prefer `finditer` — it yields `Match` objects addressable by `.group("name")`. `findall` returns raw strings or tuples and forces you to remember group order.

---

## Concept 3 — `re.sub` for substitution

`re.sub(pattern, replacement, string, count=0)`. `count=0` means replace all; `count=1` does just the first. Two replacement shapes:

```python
# Backreference: refer to captured groups in the replacement string
re.sub(r"(\w+)@(\w+\.\w+)", r"\1@***", "alice@example.com")
# → 'alice@***'

# Function replacement: full control over each match
re.sub(r"\d+", lambda m: str(int(m.group(0)) * 2), "a1 b2 c3")
# → 'a2 b4 c6'
```

The canonical interview prompt: mask every email / IP / token in a log line. `re.sub` with one pattern is one line.

---

## Concept 4 — Groups: positional, non-capturing, named

Three group flavors:

- `()` capturing — `m.group(1)`, `m.group(2)`, ...
- `(?:...)` non-capturing — groups for the engine, invisible to `.group()` numbering.
- `(?P<name>...)` named capturing — `m.group("name")`, or `m.groupdict()` for all of them.

```python
m = re.match(r"(?P<ip>\d{1,3}(?:\.\d{1,3}){3}) (?P<verb>GET|POST) (?P<path>/\S*)",
             "10.0.0.1 GET /health")
m.groupdict()
# → {'ip': '10.0.0.1', 'verb': 'GET', 'path': '/health'}
```

Named groups are the production-grade default: the pattern stays readable, and edits that add or remove capturing groups don't silently shift `m.group(3)` to mean a different thing.

---

## Concept 5 — `re.compile` for hot loops

If you apply the same regex to many inputs, compile it once outside the loop:

```python
LOG = re.compile(r"^(?P<level>ERROR|WARN|INFO) (?P<msg>.+)$", re.MULTILINE)

for line in lines:
    m = LOG.match(line)
    if m:
        emit(m.groupdict())
```

The module-level `re.search(pat, s)` calls keep an internal cache, so the cost of re-compiling is small — but explicit `re.compile` is faster, signals intent, and lets you pass flags (`re.IGNORECASE | re.MULTILINE`) once instead of at every call site.

---

## Quick check before you run cards

Make sure you can answer these out loud:

1. When do you reach for `str.startswith` vs `re.match`?
2. Why does `re.match(r"ERROR", "log: ERROR")` return `None`?
3. How would you mask every email address in a log with `re.sub`?
4. What does `(?:...)` give you that `()` doesn't?
5. You're applying the same regex to 10,000 lines — what's the one-line optimization?

If any of those five feels shaky — re-read that section, then start the cards.
