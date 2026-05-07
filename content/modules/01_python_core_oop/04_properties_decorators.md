---
module_id: 1
sphere_id: "m1-s4"
title: "Properties & Decorators"
title_ru: "Свойства и декораторы"
estimated_minutes: 14
prerequisites: ["m1-s1"]
tags: ["python-core", "oop", "decorators", "properties", "interview-classic"]
---

# Properties & Decorators

`@property` is how you turn an attribute access into a method call without breaking the caller. Decorators are closures that wrap a function with extra behavior. Both questions appear in junior screens, both have a small set of mechanical traps, and both reuse the closure mechanics from Sphere 0's LEGB discussion.

## Why this matters in interviews

Three frequent questions: "when would you use `@property` instead of just exposing the attribute?", "write a decorator that times a function", and "what does `@functools.wraps` do, and why does it matter?". The interviewer is checking that you understand the *mechanism* — that decorators are functions returning functions, and that `@wraps` copies metadata so the inner function still looks like itself.

## Concept 1 — `@property` and `@<name>.setter`

`@property` turns a method into a read-only attribute. Add `@<name>.setter` for write access — typically with validation that a plain attribute couldn't enforce:

```python
class User:
    def __init__(self, age: int):
        self._age = age

    @property
    def age(self) -> int:
        return self._age

    @age.setter
    def age(self, value: int) -> None:
        if value < 0:
            raise ValueError("age must be ≥ 0")
        self._age = value
```

Callers still write `u.age = 30`. The setter runs every time — including the very first assignment, so be careful inside `__init__` if you assign `self.age = ...` instead of `self._age = ...`.

## Concept 2 — Custom decorators

A decorator is a function that takes a function and returns a function — usually a wrapper that calls the original with extra behavior around it:

```python
def announce(fn):
    def wrapper(*args, **kwargs):
        print(f"calling {fn.__name__}")
        result = fn(*args, **kwargs)
        print(f"{fn.__name__} returned {result!r}")
        return result
    return wrapper

@announce
def add(x, y): return x + y
```

`@announce` is sugar for `add = announce(add)`. The closure over `fn` is what lets the wrapper know which function to call — same mechanic as the closures in Sphere 0.

The `*args, **kwargs` in `wrapper` is what makes the decorator reusable across functions with different signatures. Without it, your decorator only works on no-argument functions.

## Concept 3 — Decorators with arguments

If you want `@retry(times=3)`, you need *another* layer — a function that returns a decorator:

```python
def retry(times: int):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            for _ in range(times):
                try:
                    return fn(*args, **kwargs)
                except Exception:
                    continue
            raise
        return wrapper
    return decorator
```

Three nested functions: `retry` (parameterized factory), `decorator` (the actual decorator), `wrapper` (the runtime call). Recognize this three-layer shape — it's the canonical "decorator with arguments" pattern.

## Concept 4 — `functools.wraps`

By default, a decorator hides the wrapped function's identity:

```python
@announce
def add(x, y):
    """Add two numbers."""
    return x + y

print(add.__name__)   # 'wrapper'
print(add.__doc__)    # None
```

That breaks documentation tools, debuggers, and some test frameworks. `@functools.wraps(fn)` on the wrapper copies the original's `__name__`, `__doc__`, `__module__`, `__qualname__`, `__dict__`, and `__wrapped__` over:

```python
from functools import wraps

def announce(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        ...
    return wrapper
```

It's a one-line fix and you should always use it on production decorators. The `__wrapped__` attribute also gives you a way to reach the original function, which test code sometimes wants.

## Practice cards

After reading this, run the cards for `m1-s4`. The `@property`-setter-runs-from-init trap and the missing-`@wraps` consequences are the two with the highest interview leverage.
