---
module_id: 1
title: "Python Core & Object-Oriented Design"
title_ru: "Ядро Python и объектно-ориентированный дизайн"
estimated_minutes: 6
prerequisites: []
tags: ["python-core", "oop"]
---

# Module 1 — Python Core & OOP

This module is the bedrock. It is what 80% of junior Python interviewers test in the first 20 minutes of a screen, and it is where most candidates lose the role — not because they don't know Python, but because they don't know it *precisely* enough to answer "what does this code print, and why?" without hesitating.

## What this module covers

Seven spheres, taught in order:

1. **Foundations & Hidden Traps** — mutability, default arguments, scope, `if __name__`. The classic gotchas that ship into interview screens word-for-word.
2. **Class Architecture** — `__init__`, `self`, attributes, encapsulation, method types, type hints.
3. **Inheritance & Exceptions** — `super`, MRO, `try/except/raise`, custom exceptions.
4. **Dunder Methods** — `__str__`, `__repr__`, `__len__`, `__eq__` and friends.
5. **Properties & Decorators** — `@property`, custom decorators with `functools.wraps`.
6. **Memory & Lazy Evaluation** — generators, comprehensions, context managers.
7. **Concurrency & GIL** — why threading doesn't speed up CPU work, when to use `asyncio`.

## How to work through it

For each sphere:
1. Read the lesson once, end to end. **Don't skim.**
2. Run the cards. Rate honestly — `Again` if you needed the answer, `Hard` if you got there slowly, `Good` if it came naturally, `Easy` if it was instant.
3. Come back tomorrow. The scheduler will resurface the cards you struggled on.

Expect to need 3–5 sessions per sphere before the cards feel automatic. That's normal. That's the point.

## What "done" with this module looks like

You can:
- Predict any code-trap output and explain *why* (not just guess the answer).
- Write a class with `@property`, `@classmethod`, `@staticmethod` from a blank file.
- Explain MRO out loud to a non-Python developer.
- Answer "why doesn't `threading` make my CPU code faster?" without saying "I'm not sure".

Once that's true, the platform will mark this module as `mastered` and gently de-prioritize it in your review queue.
