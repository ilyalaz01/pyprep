---
module_id: 3
sphere_id: "m3-s4"
title: "Mocking & Patching"
title_ru: "Mocking и Patching"
estimated_minutes: 16
prerequisites: ["m3-s3"]
tags: ["pytest", "mock", "patch", "side-effect", "interview-heavy"]
---

# Mocking & Patching

About 40% of QA / automation interview screens probe mocking specifically. Real automation code spends most of its time calling other systems — HTTP APIs, databases, queues, the filesystem — and test code mocks all of it. The difference between "this test asserts something" and "this test asserts nothing because the mock isn't installed" is two characters of import-path argument juniors get wrong constantly.

## Why this matters in interviews

The interviewer is checking whether you understand `@patch` as **path manipulation** (you patch a *name* in a *namespace*, not a function in the universe) and whether you reach for `assert_called_once_with` reflexively. The marquee question is "you patched `requests.get` and the mock didn't take effect — why?" — answer: *the Golden Rule of patching*: patch where the name is *used*, not where it's *defined*.

---

## Concept 1 — `Mock`, `MagicMock`, and `return_value`

```python
from unittest.mock import Mock, MagicMock

m = Mock()
m.fetch.return_value = {"id": 42, "name": "alice"}
m.fetch()                  # → {'id': 42, 'name': 'alice'}
m.fetch("anything")        # → {'id': 42, 'name': 'alice'}  (return_value ignores args)
```

`Mock` auto-creates attributes and methods on access — `m.anything.you.want()` works without complaint. `MagicMock` is `Mock` plus pre-configured magic methods (`__len__`, `__iter__`, `__enter__`, etc.) for protocols. Use `MagicMock` when the mocked object will be `len(m)`-ed or `iter`-ed or `with m:`-ed.

The typo footgun: `m.fetech.return_value = ...` silently creates a new attribute; production calls `m.fetch()` and gets a *different* Mock. **Use `spec=` or `create_autospec`** to constrain the mock to a real interface — typos raise `AttributeError`.

---

## Concept 2 — `assert_called_*` and the LAST-call gotcha

Four assertion methods worth knowing:

```python
m.assert_called()                    # called at least once
m.assert_called_once()               # called exactly once
m.assert_called_with(*args, **kw)    # the LAST call matched these args
m.assert_called_once_with(*args, **kw)   # called exactly once with these args
```

The gotcha: **`assert_called_with` checks only the most recent call**. If code called `m(1)` then `m(2)`, `assert_called_with(1)` fails and `assert_called_with(2)` passes. Prefer `assert_called_once_with` when the test asserts "called exactly once" — it combines count and args. For multi-call verification: `m.call_args_list` (every call) or `m.assert_any_call(...)` (was called with at some point).

---

## Concept 3 — `@patch` where used, not where defined (THE Golden Rule)

```python
# src/myapp/users.py
import requests

def fetch_user(user_id):
    return requests.get(f"https://api/users/{user_id}").json()

# tests/test_users.py
from unittest.mock import patch

@patch("myapp.users.requests.get")     # CORRECT — where it's *used*
def test_fetch_user(mock_get):
    mock_get.return_value.json.return_value = {"id": 42}
    fetch_user(42)
    mock_get.assert_called_once()
```

The wrong target — `@patch("requests.get")` — patches `requests`'s module attribute, but `myapp.users` already imported `get` into its own namespace at module load. The local reference still points at the original; the mock isn't seen. Test passes silently against unmocked code.

**Rule:** `@patch("<module that uses it>.<name>")`. The string is the import path *from the perspective of the code under test*, not where the function was defined.

---

## Concept 4 — `with patch(...)` context manager

```python
def test_one_specific_call():
    with patch("myapp.users.requests.get") as mock_get:
        mock_get.return_value.json.return_value = {"id": 42}
        result = fetch_user(42)
    assert result == {"id": 42}
```

Use the context-manager form when only *part* of a test needs the patch. The decorator patches for the whole test function; the `with` block patches for that block only. Same target, different lifetime.

---

## Concept 5 — `side_effect`: sequences, exceptions, callables

```python
m.side_effect = ValueError("nope")             # raises on every call
m.side_effect = [1, 2, 3]                       # returns 1, then 2, then 3, then StopIteration
m.side_effect = lambda x: x * 2                 # callable — runs per call
m.side_effect = [Timeout(), Timeout(), Response(200)]   # retry-then-succeed simulation
```

`side_effect` overrides `return_value` and gives per-call behavior. Marquee use case: **simulate retry-then-succeed** by passing a list of exceptions followed by a return value.

Subtle gotcha: `side_effect=Exception` (the *class*) raises `Exception()` on call; `side_effect=Exception("msg")` (an *instance*) raises that specific instance. Both work. `side_effect=some_callable` calls the callable with the mock's args and returns its result.

---

## Quick check before you run cards

1. Why use `spec=` or `create_autospec` instead of bare `Mock()`?
2. What's the difference between `assert_called_with(x)` and `assert_called_once_with(x)`?
3. The Golden Rule of `@patch` — one sentence.
4. When do you reach for the `with patch()` context manager over `@patch` decorator?
5. How does `side_effect=[Timeout(), Timeout(), response]` simulate retry-then-succeed?

If any feels shaky — re-read that section, then start the cards.
