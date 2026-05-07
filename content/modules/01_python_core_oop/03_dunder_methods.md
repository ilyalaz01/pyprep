---
module_id: 1
sphere_id: "m1-s3"
title: "Dunder Methods"
title_ru: "Дандер-методы"
estimated_minutes: 13
prerequisites: ["m1-s1"]
tags: ["python-core", "oop", "dunder", "interview-classic"]
---

# Dunder Methods

Dunder ("double-underscore") methods are how Python's built-in syntax — `print(x)`, `len(x)`, `x == y`, `for item in x`, `sorted(items)` — talks to your classes. The interview test is whether you know which dunder to override for which behavior, plus the small set of footguns that come with each pair.

## Why this matters in interviews

Three common questions: "what's the difference between `__str__` and `__repr__`?", "if you define `__eq__`, what *else* do you need to define?", and "what minimum dunders make `for x in mything:` work?". The honest answers in 30 seconds each are what the interviewer is timing.

## Concept 1 — `__str__` vs `__repr__`

`__str__` is for humans (`print(obj)`, `str(obj)`, `f"{obj}"`). `__repr__` is for developers — ideally an unambiguous, debuggable form, often eval-able. The REPL uses `__repr__`. If only `__repr__` is defined, `__str__` falls back to it; the reverse is not true.

```python
class Point:
    def __init__(self, x, y): self.x, self.y = x, y
    def __repr__(self):
        return f"Point(x={self.x!r}, y={self.y!r})"
```

That's enough to make `repr(p)`, the REPL view, and `print(p)` (via fallback) all useful. Add `__str__` only when humans need a different format from developers.

## Concept 2 — `__len__` and truthiness

`len(x)` calls `x.__len__()`. So does `bool(x)` — for any object that doesn't override `__bool__`, Python falls back to "true if `len(self) > 0`, else false". That's why an empty list is falsy.

```python
class Box:
    def __init__(self, items): self.items = items
    def __len__(self): return len(self.items)

bool(Box([]))   # False — no __bool__, falls back to len == 0
```

If a class is "truthy by something other than length," override `__bool__`.

## Concept 3 — `__getitem__`, `__setitem__`, and iteration for free

`__getitem__` makes `obj[i]` work. Defining it alone (with no `__iter__`) gives you `for x in obj:` *almost* for free — Python falls back to repeatedly calling `obj[0]`, `obj[1]`, … until `IndexError`. This is a legacy iteration protocol; the modern, intentional way is to define `__iter__` returning an iterator. Use `__getitem__`-only iteration only if your class is truly index-addressable.

```python
class Tape:
    def __init__(self, data): self.data = list(data)
    def __getitem__(self, i): return self.data[i]
    def __len__(self): return len(self.data)
```

`for c in Tape("abc"):` works — but iterating over a non-indexable type with this trick is a bug waiting to happen.

## Concept 4 — `__eq__` and `__hash__` come as a pair

If you define `__eq__`, Python automatically sets `__hash__ = None` on your class — making instances unhashable. They can no longer be dict keys or set members. Two options:

1. The class is genuinely mutable / equality-by-content → keep it unhashable.
2. The class is value-like (a `Point`, a `Money(amount, currency)`) → define `__hash__` consistent with `__eq__`: equal objects must hash equal.

```python
class Point:
    def __init__(self, x, y): self.x, self.y = x, y
    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)
    def __hash__(self):
        return hash((self.x, self.y))
```

The `NotImplemented` return is the second non-obvious bit: returning `False` for `Point() == 5` looks reasonable, but it breaks Python's mutual-comparison machinery. Returning `NotImplemented` lets Python try the *other* object's `__eq__` and reach a proper answer.

## Concept 5 — Ordering: `__lt__`, `__gt__`, and `@total_ordering`

`sorted(items)` and `list.sort()` need exactly one of `__lt__` (or `__gt__`); the rest is built on top. To get the full set (`<`, `<=`, `>`, `>=`) from one definition, decorate with `functools.total_ordering`:

```python
from functools import total_ordering

@total_ordering
class Score:
    def __init__(self, n): self.n = n
    def __eq__(self, other): return self.n == other.n
    def __lt__(self, other): return self.n < other.n
```

That's enough to `sorted([Score(3), Score(1)])` and use `>=` etc. without writing them.

## Practice cards

After reading this, run the cards for `m1-s3`. The `__eq__`-without-`__hash__` trap and the `__getitem__`-induced iteration are the two highest-leverage interview questions.
