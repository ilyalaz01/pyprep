---
module_id: 1
sphere_id: "m1-s5"
title: "Memory & Lazy Evaluation"
title_ru: "Память и ленивые вычисления"
estimated_minutes: 13
prerequisites: []
tags: ["python-core", "generators", "context-managers", "interview-classic"]
---

# Memory & Lazy Evaluation

Lazy evaluation is how Python lets you process data you can't (or don't want to) materialize all at once. Generators turn functions into stream producers. Comprehensions come in two flavors — eager (lists) and lazy (generators). Context managers compose `try/finally` blocks into reusable shapes. All three are interview-frequent and all three have small footguns that catch juniors.

## Why this matters in interviews

Three near-universal questions: "what does `yield` do?", "what's the difference between `[x for x in ...]` and `(x for x in ...)`, and when would you use each?", and "implement a context manager that times its body". The honest answers in 30 seconds each is what the interviewer is timing.

## Concept 1 — Generators with `yield`

`yield` turns a function into a *generator function*. Calling it does not run the body — it returns a generator object. The body runs incrementally: each `next(gen)` resumes the function until the next `yield`, then pauses. Local state is preserved between `yield`s.

```python
def count_up(n):
    i = 0
    while i < n:
        yield i
        i += 1

g = count_up(3)
next(g)      # 0
next(g)      # 1
next(g)      # 2
next(g)      # StopIteration
```

`for x in g` and `list(g)` both consume the generator until exhaustion. Once exhausted, it stays exhausted — re-iterating gives nothing. Same closure-over-state mechanic as Sphere 4's decorators, but explicit.

`yield` and `return` coexist in a generator: `return` ends iteration (raises `StopIteration` with the returned value).

## Concept 2 — Generator expressions vs list comprehensions

Same syntax, different brackets:

```python
[x * x for x in range(1_000_000)]   # list comprehension — materializes all 1M values
(x * x for x in range(1_000_000))   # generator expression — yields one at a time
```

Memory and time profile:

- **List comp** allocates the full list up front; subsequent iteration is just walking memory.
- **Gen expr** holds only the current state; each value is produced on demand.

Pick by intent: if you're going to iterate once and forget, gen expr. If you need indexing, length, or to iterate multiple times, list comp. If the source is small (~hundreds of items), the difference is irrelevant; reach for list for ergonomic reasons.

A common idiom: `sum(x * x for x in items)` — the parens around the gen expr are implicit when it's the only argument to a function call.

## Concept 3 — Context managers (`with` / `__enter__` / `__exit__`)

A context manager is any object that implements `__enter__` (called before the `with` body) and `__exit__` (called after, even on exception). It's a clean way to bracket setup/teardown — file open/close, lock acquire/release, transaction begin/commit:

```python
class Timer:
    def __enter__(self):
        self.start = time.perf_counter()
        return self                   # what `as t:` binds to

    def __exit__(self, exc_type, exc_val, tb):
        self.elapsed = time.perf_counter() - self.start
        return False                  # don't swallow exceptions

with Timer() as t:
    do_work()
print(t.elapsed)
```

`__exit__` returns truthy to *suppress* the exception that's propagating; usually you return `False` (or nothing) so exceptions bubble. This is the same try/finally mechanic from Sphere 2, generalized into a reusable object.

For one-shot context managers, `@contextlib.contextmanager` lets you write a generator instead of a class:

```python
from contextlib import contextmanager

@contextmanager
def timer():
    start = time.perf_counter()
    yield                  # everything before yield is __enter__'s work
    print(time.perf_counter() - start)
```

`yield` here splits setup from teardown. Anything after `yield` runs in `__exit__`. To handle exceptions, wrap the `yield` in a `try/except`.

## Practice cards

After reading this, run the cards for `m1-s5`. The "generator runs lazily" trap and the `__exit__`-return-value-suppresses-exception trap are the two highest-leverage interview hooks here.
