---
module_id: 1
sphere_id: "m1-s2"
title: "Inheritance & Exception Handling"
title_ru: "Наследование и обработка исключений"
estimated_minutes: 16
prerequisites: ["m1-s1"]
tags: ["python-core", "oop", "exceptions", "interview-classic"]
---

# Inheritance & Exception Handling

Two unrelated topics, paired here because both come up in the same junior screen and both punish imprecision. Inheritance questions test whether you understand the *mechanism* of `super()`. Exception questions test whether you've ever debugged a real `finally` block.

## Why this matters in interviews

Expect three flavors. **Mechanics**: "What does `super().__init__()` actually do, and what breaks if you forget it?" **Diamond**: "Given this multi-inheritance setup, what's the MRO and why?" **Pragmatics**: "Why is `except:` (bare) a code smell, and how do you build a custom exception hierarchy?" Candidates lose points for vague answers more than for wrong ones.

## Concept 1 — `class Child(Parent)` and `super().__init__()`

`super()` returns a proxy object that delegates attribute lookups to the *next class in the MRO* — usually the parent, but in multiple inheritance it's whichever class C3 picks next. `super().__init__(...)` runs the parent's initializer so the parent-side state is set.

```python
class Animal:
    def __init__(self, name: str):
        self.name = name

class Dog(Animal):
    def __init__(self, name: str, breed: str):
        super().__init__(name)
        self.breed = breed
```

Forget `super().__init__(name)` and `dog.name` raises `AttributeError`. The parent's `__init__` is *not* called automatically.

## Concept 2 — Method overriding (and extending with `super()`)

A subclass can override a parent method by redefining it. Often you want to *extend* rather than replace — call `super().method(...)` to run the parent's logic, then add your own:

```python
class Logger:
    def log(self, msg: str) -> None:
        print(msg)

class TimestampLogger(Logger):
    def log(self, msg: str) -> None:
        super().log(f"[2026-05-07] {msg}")
```

Method dispatch is dynamic: when a parent method calls `self.something()`, Python uses the most-derived class's `something` — not the parent's. That's why `__str__`/`__repr__` work the way they do.

## Concept 3 — Multiple inheritance & MRO

Python uses **C3 linearization** to compute a single, deterministic order in which to resolve methods across multiple parents. You can read it on any class:

```python
class A: ...
class B(A): ...
class C(A): ...
class D(B, C): ...

print(D.__mro__)
# (<D>, <B>, <C>, <A>, <object>)
```

In the diamond, `D` sees `B` before `C` (left-to-right in the bases) and `A` only once at the end. `super()` walks this list, not just "the parent". That's the whole reason `super()` is preferred over `Parent.__init__(self)` — the latter pins you to a specific class and breaks cooperative multiple inheritance.

## Concept 4 — `try / except / finally / raise`

Mechanics worth committing to memory:

- `finally` runs whether or not an exception was raised, **and even if you `return` from inside `try`**.
- A bare `except:` catches `BaseException`, which includes `SystemExit` and `KeyboardInterrupt` — code that does this can't be cleanly killed. Always catch a specific class.
- `raise` (no argument) re-raises the current exception inside an `except` block. `raise NewError(...) from original_error` chains causes for cleaner tracebacks.

```python
try:
    risky()
except ValueError as e:
    raise AppError("rejected input") from e
```

## Concept 5 — Custom exception classes

Subclass `Exception`, never `BaseException`. Build a small hierarchy so callers can catch broadly or narrowly:

```python
class AppError(Exception):
    """Root of all app errors."""

class ValidationError(AppError):
    """Input failed schema check."""

class NotFoundError(AppError):
    """Requested resource isn't there."""
```

A caller writes `except AppError:` to catch everything app-related, or `except ValidationError:` to handle only one kind. This is the same pattern Python's stdlib uses (`OSError` → `FileNotFoundError`, `PermissionError`, …).

## Practice cards

After reading this, run the cards for `m1-s2`. The diamond and the `finally`-with-`return` trap are the two highest-value ones for interview prep.
