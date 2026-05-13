---
module_id: 3
sphere_id: "m3-s3"
title: "Fixtures"
title_ru: "Фикстуры"
estimated_minutes: 13
prerequisites: ["m3-s1", "m3-s2"]
tags: ["pytest", "fixture", "yield", "scope", "conftest", "interview-heavy"]
---

# Fixtures

Fixtures are how pytest separates **setup** (build the inputs a test needs) from the test itself, *without* a `setUp`/`tearDown` class hierarchy. They're the most distinctive pytest feature, the one that makes test code read like prose instead of plumbing, and the topic that distinguishes engineers who've actually used pytest from those who've only seen it in tutorials.

## Why this matters in interviews

The interviewer is checking two things: whether you understand fixtures as a **dependency-injection system** (not just "setup functions"), and whether you know the operational landmines — especially the `yield` cleanup property and the session-scoped mutable state trap. Both are quick to ask, hard to fake, and predictive of whether you'll write a test suite future-you can debug.

---

## Concept 1 — `@pytest.fixture` and name-matching DI

```python
import pytest

@pytest.fixture
def cart():
    return Cart()

def test_cart_starts_empty(cart):
    assert cart.total() == 0

def test_cart_add_increases_total(cart):
    cart.add(Item("apple", price=10))
    assert cart.total() == 10
```

The mechanism: pytest sees `cart` in the test's parameter list, looks up a fixture *named `cart`* (in the same file, in `conftest.py`, or in plugins), calls it, and passes the result. **Fixtures are matched by parameter name**, not by type or import. That's the dependency-injection part — your test declares what it needs, pytest builds it.

Fixtures can depend on fixtures: `def repo(db_session): ...` declares a `db_session` parameter, which pytest resolves the same way. The DI graph runs deepest-first: `db → session → repo → test`. This is how production test suites stay readable — each layer is one job.

---

## Concept 2 — `yield` for setup AND teardown

```python
@pytest.fixture
def db_session():
    session = SessionFactory()
    try:
        yield session              # test runs here
    finally:
        session.rollback()         # ALWAYS runs — even if the test fails
        session.close()
```

The `yield` form is the canonical resource pattern: setup before, cleanup after. The critical property: **teardown runs even if the test raises or asserts false**. pytest catches the exception, re-enters the generator (running the `finally`), then re-raises. You get guaranteed cleanup without try/except in the test body.

Before `yield`, fixtures used a `request.addfinalizer(cleanup)` callback. That style still works but reads worse. New code is `yield` only.

---

## Concept 3 — Scopes: function (default), class, module, session

```python
@pytest.fixture(scope="session")
def db():
    db = expensive_connection()
    yield db
    db.close()
```

Four scopes:

- **`function`** (default) — fresh fixture per test. Safest; slowest if setup is expensive.
- **`class`** — one fixture per test class.
- **`module`** — one fixture per `.py` file.
- **`session`** — one fixture per `pytest` invocation.

Use a wider scope only when (a) setup is genuinely expensive (DB connection, Docker container) and (b) the fixture is **read-only** within tests.

The landmine: a session-scoped *mutable* fixture (a list someone `append`s to in test A) contaminates every test that runs after — and pytest can run tests in arbitrary order, so the failures are intermittent and order-dependent. Wider scope multiplies the surface of every shared mutation. Default to `function`; widen only when you've measured the cost.

---

## Concept 4 — `conftest.py` for cross-file sharing

A fixture defined in `tests/conftest.py` is **automatically available to every test under `tests/`**, no import needed. pytest discovers `conftest.py` files by walking the directory tree from each test file up to the project root; fixtures defined in a closer `conftest.py` override those in a farther one.

```
tests/
├── conftest.py              ← fixtures shared across all tests
├── unit/
│   ├── conftest.py          ← fixtures only for tests/unit/
│   └── test_users.py
└── integration/
    └── test_db.py
```

`conftest.py` is **never imported by your code** — pytest auto-discovers it. Putting `import conftest` in a test file is wrong and unnecessary. Use `conftest.py` when ≥2 test files need the same fixture; for one file, inline it.

---

## Quick check before you run cards

1. How does pytest decide which fixture to pass to a test's `cart` parameter?
2. Why is the `yield` form preferred over a `request.addfinalizer` callback?
3. Default fixture scope — and when do you widen it?
4. What goes wrong with `scope="session"` on a mutable fixture?
5. Why don't you `import conftest`?

If any feels shaky — re-read that section, then start the cards.
