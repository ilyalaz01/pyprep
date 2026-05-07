---
module_id: 1
sphere_id: "m1-s6"
title: "Concurrency & GIL"
title_ru: "Конкурентность и GIL"
estimated_minutes: 14
prerequisites: []
tags: ["python-core", "concurrency", "gil", "asyncio", "threading", "interview-classic"]
---

# Concurrency & GIL

Python's concurrency story is three tools (threading, multiprocessing, asyncio) gated by one architectural fact (the GIL). The questions junior interviewers actually ask are short: "why doesn't `threading` speed up my CPU code?", "when would you reach for `multiprocessing` vs `asyncio`?", and "what does `await` actually do?". Crisp answers are what get you past this section.

## Why this matters in interviews

Concurrency is where candidates either show that they've shipped real I/O-bound code or that they've only read about it. The interviewer is checking that you (a) know the GIL is a thread-scheduler lock, not "Python is single-threaded", (b) can pick the right tool for I/O-bound vs CPU-bound, and (c) don't think `async` magically parallelizes everything.

## Concept 1 — The GIL

The Global Interpreter Lock is a CPython implementation detail: only **one thread can execute Python bytecode at a time**. The lock is released around I/O syscalls (file reads, socket reads, `time.sleep`), so threading still gives you concurrency for I/O-bound work. It's *not* released during pure-Python computation, so `threading` cannot speed up CPU-bound loops.

Two practical consequences:

- A `for i in range(N): counter += 1` across threads is **not safe** — `counter += 1` is multiple bytecodes (LOAD, ADD, STORE), and the GIL can switch between any two of them. Use `threading.Lock` for shared counters.
- `time.sleep(s)` releases the GIL while the thread waits; so do `requests.get(...)`, file reads, socket I/O. That's why a thread pool of HTTP requests is faster than serial — the GIL is gone for most of each request's lifetime.

## Concept 2 — `threading` vs `multiprocessing`

The choice depends on the workload:

- **I/O-bound** (HTTP requests, DB queries, file reads, sleep): `threading` (or `asyncio`). The GIL is released during the wait; multiple threads make progress concurrently.
- **CPU-bound** (number crunching, image processing, parsing large strings): `multiprocessing`. Each worker is a separate Python process with its own GIL — true parallelism, at the cost of process-spawn overhead and inter-process communication (IPC, usually via pickling).
- **Many concurrent I/O operations on a single thread**: `asyncio`. No process or thread overhead; one event loop juggles thousands of coroutines.

The trade-off for `multiprocessing` is the IPC cost: arguments and return values are pickled and shipped between processes. Tiny, fast tasks can spend more time on pickling than computing — `multiprocessing` shines for **chunky** CPU work.

## Concept 3 — `asyncio`: event loop, `async`/`await`, `gather`

`async def` defines a coroutine function. Calling it returns a *coroutine object* — the body has not run yet. The coroutine runs only when awaited (or scheduled by the event loop):

```python
import asyncio

async def fetch(x):
    await asyncio.sleep(0.1)
    return x * 2

async def main():
    return await asyncio.gather(fetch(1), fetch(2), fetch(3))

asyncio.run(main())   # [2, 4, 6]
```

`asyncio.gather(*coros)` runs the coroutines concurrently on the same thread. The returned list preserves the **input order**, not the completion order — a frequent gotcha.

Two recurring traps:

- Forgetting `await`: `result = fetch(1)` gives you a coroutine object, not the value. The body never runs.
- Calling `asyncio.run(...)` from inside a coroutine: `RuntimeError: asyncio.run() cannot be called from a running event loop`. There is one loop; use `await` instead.

## Concept 4 — I/O-bound vs CPU-bound

Mental model: a task is **I/O-bound** if it spends most of its time waiting for something outside Python — disk, network, a sleeping timer. It's **CPU-bound** if it spends most of its time running Python bytecode.

Quick recognition signals:

- Lots of `requests.get`, `time.sleep`, file reads, DB calls → I/O-bound → reach for `asyncio` or `threading`.
- Tight `for` loops over numeric data, regex over giant strings, image transforms → CPU-bound → reach for `multiprocessing` (or, if it's hot, drop to NumPy/Cython/native libs that release the GIL).

If `asyncio.gather(...)` over CPU-bound coroutines isn't speeding you up, that's the diagnostic — there's nothing for the event loop to do while the coroutine is actively computing. Move that work to a process pool.

## Practice cards

After reading this, run the cards for `m1-s6`. The race-condition trap (`counter += 1`) and the gather-order trap are the two with the highest interview leverage; the forgot-`await` trap is the one most candidates have actually hit in real code.
