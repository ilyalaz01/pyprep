---
module_id: 2
sphere_id: "m2-s7"
title: "Modern Backend Basics"
title_ru: "Современный backend на FastAPI"
estimated_minutes: 14
prerequisites: ["m2-s3", "m2-s4"]
tags: ["fastapi", "pydantic", "depends", "async", "interview-heavy"]
---

# Modern Backend Basics

FastAPI has become the de facto modern Israeli backend stack for student and junior roles, even when the JD doesn't say "FastAPI". The signal an interviewer reads is your fluency with type-hint-driven routing, Pydantic models at the boundary, and the `Depends` dependency-injection pattern — three primitives that distinguish a 2026 backend engineer from someone whose Python stopped at Flask 1.0.

## Why this matters in interviews

The interviewer isn't asking you to build a service from scratch in 30 minutes. They're looking for the small set of idioms that signal you've actually shipped FastAPI code: typed path params, a Pydantic request-body model, a `Depends`-injected DB session with `yield` for cleanup, and a reflexive answer to "when do I use `async def`?". Get those four, you pass; miss them, you don't.

---

## Concept 1 — Routing and typed parameters

```python
from fastapi import FastAPI
app = FastAPI()

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"id": item_id, "q": q}
```

Path parameters go in `{curly_braces}` and match function arguments by name. The **type hint drives both validation and coercion**: `item_id: int` means FastAPI parses `/items/42` to `int(42)`, and `/items/abc` returns `422 Unprocessable Entity` with a structured error — you write no parsing or validation code. Any function argument *not* in the path is automatically a query parameter (`?q=hello`). `/docs` renders OpenAPI / Swagger UI automatically from the same type hints.

---

## Concept 2 — Pydantic models at the boundary

```python
from pydantic import BaseModel, Field

class ItemIn(BaseModel):
    name: str
    price: float = Field(gt=0)

@app.post("/items", response_model=ItemIn)
def create_item(item: ItemIn):
    return item
```

A `BaseModel` type-hinted as a function parameter tells FastAPI "parse the request body as JSON, validate against this model, give me the typed instance." On mismatch (missing field, wrong type, `Field` constraint violation) the framework returns `422` with a structured error list — no try/except needed in your handler. `response_model=` works in the other direction, validating the outgoing payload.

Pydantic v2 names: `Model.model_validate(dict)`, `Model.model_validate_json(str)`, `instance.model_dump()`. v1's `parse_obj` / `dict()` are shims; new code uses v2.

---

## Concept 3 — `Depends` for dependency injection

```python
from fastapi import Depends

def get_db():
    db = connect()
    try:
        yield db
    finally:
        db.close()

@app.get("/items")
def list_items(db = Depends(get_db)):
    return db.query(Item).all()
```

The `yield` form is the canonical resource-management pattern: setup before `yield`, cleanup after — guaranteed to run even if the handler raises. Same dependency referenced multiple times in one request is **resolved once and cached** (default `use_cache=True`); two endpoints sharing `Depends(get_db)` in the same request share the same DB session.

Common uses: DB session, current user from JWT, settings/config. Dependencies can depend on dependencies — chained DI is the norm.

---

## Concept 4 — `async def`, sync, and `BackgroundTasks`

```python
@app.get("/slow")
async def slow():
    await asyncio.sleep(5)        # OK: non-blocking
    # time.sleep(5)               # BAD: blocks the event loop, freezes all requests
    return {"ok": True}
```

Rule of thumb: **`async def` if the body `await`s I/O; plain `def` if it doesn't.** FastAPI runs `async def` handlers on the event loop and `def` handlers in a thread pool — so sync handlers don't block the loop. The trap is an `async def` handler that does sync blocking work (`time.sleep`, sync DB calls, CPU-heavy loops) — that *does* block the loop and starves every concurrent request.

`BackgroundTasks` is fire-and-forget after-the-response:

```python
from fastapi import BackgroundTasks

@app.post("/signup")
def signup(user: UserIn, bg: BackgroundTasks):
    save(user)
    bg.add_task(send_welcome_email, user.email)
    return {"ok": True}
```

It runs in the same process *after* the response is sent and is **not durable** — process restart loses the task. For real background work (retries, durability, scheduling), use Celery or a queue. The interview trap is treating `BackgroundTasks` as a job queue.

---

## Quick check before you run cards

Make sure you can answer these out loud:

1. How does FastAPI know `/items/42` should parse `42` as an `int`?
2. What does FastAPI do when the request body fails Pydantic validation?
3. Why is the `yield` form of a `Depends` function the canonical DB-session pattern?
4. When `async def` vs plain `def`?
5. When is `BackgroundTasks` the wrong tool, and what's the right one?

If any feels shaky — re-read that section, then start the cards.
