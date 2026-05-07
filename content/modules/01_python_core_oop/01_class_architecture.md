---
module_id: 1
sphere_id: "m1-s1"
title: "Class Architecture"
title_ru: "Архитектура классов"
estimated_minutes: 14
prerequisites: ["m1-s0"]
tags: ["python-core", "oop", "interview-classic"]
---

# Class Architecture

Junior Python interviews almost always include "write a small class with an `__init__`, then explain what `self` is" and "what's the difference between `@classmethod` and `@staticmethod`?". Those questions look easy. Most candidates still hesitate. This sphere is about answering them without thinking.

## Why this matters in interviews

The interviewer is checking three things at once: that you can spell out the *mechanics* (`self` is the first positional parameter, bound automatically), that you can predict where state lives (instance vs class), and that you can choose the right method type for the job. Misnaming or skipping `self` is a tell that you've only ever read OOP, not written it.

## Concept 1 — `__init__` and `self`

`__init__` is the initializer (not the constructor — `__new__` is). Python calls it right after the object is created. `self` is just the first argument; the name is convention, but every method that operates on instance state must accept it.

```python
class User:
    def __init__(self, name: str) -> None:
        self.name = name        # creates an instance attribute

    def greet(self) -> str:
        return f"hi, {self.name}"

u = User("ada")
print(u.greet())                # 'hi, ada'
```

Forgetting `self` (`def greet():`) raises `TypeError` at call time, because Python passes the instance as the first positional argument and there's nowhere for it to go.

## Concept 2 — Instance vs class attributes

A name defined inside the class body but outside any method is a **class attribute**: one shared object across every instance. A name assigned through `self.x = ...` inside a method (typically `__init__`) is an **instance attribute**: a fresh per-object slot.

```python
class Counter:
    total = 0                   # class attribute

    def __init__(self):
        self.local = 0          # instance attribute
```

Mutating a class-level mutable (list, dict) leaks across instances — the trap covered in Sphere 0. Rebinding through `self` (`self.total = 5`) creates an instance attribute that shadows the class-level one for that instance only.

## Concept 3 — Encapsulation: `_x` and `__x`

Python has no real `private`. Two conventions:

- **Single leading underscore** (`_x`): a polite "this is internal — don't touch unless you know what you're doing." The language does nothing. Tools (autocomplete, `from module import *`) honor it; runtime doesn't.
- **Double leading underscore** (`__x`, no trailing): triggers **name mangling**. Inside class `A`, `__x` is rewritten to `_A__x`. This exists to prevent accidental clashes in subclasses, not to hide anything — `_A__x` is still accessible.

```python
class A:
    def __init__(self):
        self.__secret = 42

a = A()
print(a._A__secret)   # 42 — name mangling is not security
```

## Concept 4 — Method types

Three flavors:

```python
class Date:
    def __init__(self, y, m, d):    # instance method
        self.y, self.m, self.d = y, m, d

    @classmethod
    def from_string(cls, s):        # alternative constructor
        y, m, d = map(int, s.split("-"))
        return cls(y, m, d)         # cls keeps subclasses honest

    @staticmethod
    def is_valid(y, m, d):          # utility, no class/instance state
        return 1 <= m <= 12
```

Pick by what the method *needs*:
- needs `self` → instance method
- needs the class (e.g., to construct or to dispatch) → `@classmethod`
- needs neither → `@staticmethod`. Often a sign the function should live at module level instead.

## Concept 5 — Type hints essentials

From Python 3.9+, the built-in collections are subscriptable: `list[str]`, `dict[str, int]`. The `typing.List` / `typing.Dict` forms are deprecated for new code (still valid).

```python
from collections.abc import Callable

def apply(items: list[int], f: Callable[[int], int]) -> list[int]:
    return [f(x) for x in items]
```

`Optional[X]` means `X | None` — and from Python 3.10+ the union syntax `X | None` is the modern form. `Optional` is only about the type, not about whether the parameter has a default. Type hints are **not enforced at runtime** by CPython; they're for tools (IDEs, mypy, ruff) and humans.

## Practice cards

After reading this, run the cards for `m1-s1`. Mismatch between what you'd guess and what the runtime actually does is exactly what these cards target.
