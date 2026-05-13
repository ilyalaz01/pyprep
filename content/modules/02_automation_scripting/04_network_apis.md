---
module_id: 2
sphere_id: "m2-s4"
title: "Network & APIs"
title_ru: "Сеть и API"
estimated_minutes: 13
prerequisites: ["m2-s3"]
tags: ["requests", "http", "auth", "pydantic", "timeout", "interview-classic"]
---

# Network & APIs

Almost every automation script eventually talks to another service: an internal API, a SaaS, an LLM, a webhook. `requests` is the de facto Python library and the single most-asked at Israeli automation interviews. The mechanics are easy; the failure modes are the point.

## Why this matters in interviews

The interviewer is checking whether your scripts will survive a flaky network. Code that calls `requests.get(url)` without a timeout, splits on `?` to build a query string, or trusts the JSON shape of a third-party response without validating it marks you as someone who has only called local APIs on a stable connection. The audit takes about a minute per script.

---

## Concept 1 — GET, POST, params, and bodies

The four call shapes:

```python
import requests

# GET — params dict becomes ?key=value&..., URL-encoded for you
r = requests.get("https://api.example.com/items", params={"limit": 50, "q": "hello"})

# POST JSON body — json= serializes and sets Content-Type: application/json
r = requests.post("https://api.example.com/items", json={"name": "alice"})

# POST form-encoded body — data= sends application/x-www-form-urlencoded
r = requests.post("https://api.example.com/login", data={"u": "a", "p": "b"})

# Read the response
r.json()          # parsed JSON body (raises if not JSON)
r.text            # body as str;  r.content for bytes
r.status_code     # 200, 404, 500, ...
```

The `data=` vs `json=` distinction is the most-asked question here: `data=` sends form-encoded; `json=` JSON-serializes *and* sets `Content-Type: application/json`. Mix them up and the server returns 400 because the body doesn't match the Content-Type.

---

## Concept 2 — Authentication: headers, not query strings

Most modern APIs use HTTP Basic Auth (legacy) or a Bearer token (dominant). Both live in *headers*:

```python
# Bearer token (JWT, OAuth, most SaaS APIs)
r = requests.get(url, headers={"Authorization": f"Bearer {token}"})

# HTTP Basic Auth
r = requests.get(url, auth=("user", "pass"))         # tuple shorthand
# or: requests.auth.HTTPBasicAuth("user", "pass")
```

Never put a token in the query string (`?token=...`). Query strings leak through server access logs, browser history, `Referer` headers, and most CDN/proxy logs by default. Headers don't. Same for API keys: `X-API-Key: <key>` as a header, never `?api_key=...`.

For many calls to the same host, use `requests.Session()` — it pools the connection and lets you `session.headers.update({...})` once.

---

## Concept 3 — Defensive HTTP: timeout, raise_for_status, exceptions

Three lines turn a script from "works locally" to "survives production":

```python
from requests.exceptions import RequestException

try:
    r = requests.get(url, timeout=5)         # 1. always set a timeout
    r.raise_for_status()                     # 2. blow up on 4xx/5xx
    data = r.json()
except RequestException as e:                # 3. catch the base class
    log.error("request failed: %s", e)
    raise
```

The interview question: **what happens without a timeout?** The call blocks indefinitely on a hung server — the script hangs, the CI job never finishes, the pipeline times out at the Jenkins level hours later, nobody knows why. `timeout=5` prevents this; `timeout=(connect, read)` as a tuple gives finer control.

`raise_for_status()` raises `requests.exceptions.HTTPError` on 4xx/5xx; no-op on 2xx. `RequestException` is the base class of every `requests` failure — `Timeout`, `ConnectionError`, `HTTPError`. Catch it once and you've covered the surface.

---

## Concept 4 — Pydantic for response validation

Trusting the shape of a third-party response is a bug waiting to ship. `pydantic.BaseModel` lets you declare the shape and validate at the boundary:

```python
from pydantic import BaseModel, Field

class Item(BaseModel):
    id: int
    name: str
    price: float = Field(gt=0)

raw = r.json()
item = Item.model_validate(raw)               # raises ValidationError on mismatch
# item.id, item.name, item.price all typed
```

Pydantic v2 names: `model_validate(dict)` / `model_validate_json(str)` to parse; `model_dump()` / `model_dump_json()` to serialize. The v1 names (`parse_obj`, `dict()`) still work as shims; new code uses v2.

In a FastAPI handler, a request-body `ValidationError` auto-converts to HTTP 422 with a structured error body — the framework wires the boundary check.

---

## Quick check before you run cards

Make sure you can answer these out loud:

1. Difference between `requests.post(url, data=...)` and `requests.post(url, json=...)`?
2. How do you send a Bearer token, and why not as a query parameter?
3. What happens if you forget `timeout=`?
4. What does `r.raise_for_status()` raise, on which status codes?
5. How does pydantic's `ValidationError` map to an HTTP response in FastAPI?

If any of those five feels shaky — re-read that section, then start the cards.
