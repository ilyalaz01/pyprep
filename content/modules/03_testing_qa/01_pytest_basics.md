---
module_id: 3
sphere_id: "m3-s1"
title: "pytest Basics"
title_ru: "Основы pytest"
estimated_minutes: 11
prerequisites: ["m3-s0"]
tags: ["pytest", "discovery", "assert", "cli", "interview-classic"]
---

# pytest Basics

`pytest` is the assumed default at every modern Israeli Python shop. `unittest` is legacy; reaching for `class TestThing(unittest.TestCase)` in a 2026 interview signals "I learned testing in 2015 and haven't updated." Three things to know cold: how pytest **discovers** tests, the **`assert` idiom** (and the introspection magic behind it), and the **CLI flags** that shape a test run.

## Why this matters in interviews

The interviewer isn't testing whether you can write `assert x == 5`. They're testing whether you understand *why* the test on disk doesn't run (naming convention), *how* pytest gives such useful failure messages from a bare `assert` (assertion rewriting at import time), and *which* CLI flags you reach for during a debug loop (`-v`, `-s`, `-k`, `::test_id`). All three come up in the first 15 minutes of any testing screen.

---

## Concept 1 — Discovery: naming is the contract

```
tests/
├── test_users.py          ← collected
├── test_orders.py         ← collected
├── helpers.py             ← skipped (not test_*.py)
```

```python
# inside test_users.py
def test_create_user():     # collected — starts with test_
    ...

def check_create_user():    # SILENTLY SKIPPED — wrong prefix
    ...

class TestOrder:            # collected as a test class — starts with Test
    def test_total(self):
        ...

class TestCart:
    def __init__(self):     # WARNING — pytest skips classes with __init__
        ...
    def test_add(self):
        ...
```

Defaults:

- Files: `test_*.py` or `*_test.py`.
- Functions: `test_*`.
- Classes: `Test*` (PascalCase), **no `__init__`** (use fixtures for setup).

The silently-skipped part is the trap. pytest doesn't error on `check_foo` or on a `TestCart` with `__init__` — it just doesn't run them. You see "0 collected" or fewer tests than expected and have to know naming is the cause. Defaults are configurable via `[tool.pytest.ini_options]`, but conventional layout (`tests/` mirroring `src/`) is universal; don't reconfigure.

---

## Concept 2 — `assert` and the rewriting trick

Plain Python `assert` works in pytest:

```python
def test_basic():
    assert 2 + 2 == 4
    assert "abc" in "abcdef"
    assert is_valid           # truthiness
```

The magic: pytest **rewrites your test file at import time**, replacing bare `assert` statements with versions that capture and pretty-print the operands on failure. That's why you get:

```
assert 5 == 6
       ^^^^^^
```

…with both sides shown, instead of bare `AssertionError`. The rewriting is transparent; you write `assert`, you get the rich output for free. Use `assert` exclusively — no `self.assertEqual` (that's `unittest`), no custom libraries.

**The float trap** every junior hits:

```python
assert 0.1 + 0.2 == 0.3       # FAILS — 0.30000000000000004 != 0.3
assert 0.1 + 0.2 == pytest.approx(0.3)   # passes
```

IEEE-754 floats don't sum exactly. `pytest.approx(value, rel=..., abs=...)` is the canonical fix — comparing within a tolerance instead of bit-for-bit. Reach for it any time floats are involved.

---

## Concept 3 — CLI flags: `-v`, `-s`, `-k`, `::test_id`

Four flags cover 90% of debug loops:

```bash
pytest                                    # run everything pytest finds
pytest -v                                 # verbose — show each test name + outcome
pytest -s                                 # disable output capture — see print/log inline
pytest -k "create and not slow"           # name filter, boolean expression
pytest tests/test_users.py::test_create   # run one specific test by node ID
```

`-k` has subtleties: the argument is a **boolean expression** matched against the full test ID. `pytest -k "create or update"` runs tests named `create` *or* `update`; `pytest -k "fast and not integration"` runs fast unit tests but skips fast integration ones. Matches are **substring** against the dotted test path — `pytest -k "fast"` also matches `test_breakfast`. Substring, not word boundary.

`::` is the node-ID separator: `path::class::method`. Use it for exactly-one-test runs without name-collision risk.

---

## Quick check before you run cards

Make sure you can answer these out loud:

1. Why doesn't pytest find `def check_users()`?
2. Why doesn't pytest find tests inside `class TestCart` if it has an `__init__`?
3. How does pytest produce that nice `assert 5 == 6` failure message from a plain `assert`?
4. What does `pytest -k "fast and not slow"` actually do, and what's the substring gotcha?
5. How do you run one specific test out of a 500-test suite?

If any of those five feels shaky — re-read that section, then start the cards.
