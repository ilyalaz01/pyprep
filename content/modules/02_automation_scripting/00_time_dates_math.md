---
module_id: 2
sphere_id: "m2-s0"
title: "Time & Date"
title_ru: "Время и даты"
estimated_minutes: 12
prerequisites: []
tags: ["datetime", "timedelta", "timezone", "perf-counter", "interview-classic"]
---

# Time & Date

Time is where automation scripts most often break in production. Cron triggers misfire, log timestamps go non-comparable, retry windows leak across daylight-saving boundaries, durations come out negative because somebody used wall-clock time instead of a monotonic timer. None of these bugs are exotic — they ship into junior code constantly, and interviewers know it.

## Why this matters in interviews

The interviewer is checking whether you've ever been bitten by a timezone bug. A candidate who casually writes `datetime.now(tz=timezone.utc)` and reaches for `time.perf_counter()` to measure duration has clearly worked on something that ran past one machine. A candidate who uses `datetime.utcnow()` and `time.time()` for everything signals "I've only ever run scripts on my laptop."

---

## Concept 1 — Naive vs aware datetimes

Every `datetime` object is one of two kinds:

- **Naive** — `tzinfo is None`. Just a wall of digits. Has no idea what timezone it represents.
- **Aware** — `tzinfo is not None`. Knows its offset. Can be compared and converted unambiguously.

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

naive  = datetime.now()                           # naive local time — danger
utcish = datetime.utcnow()                        # naive UTC — also danger; deprecated in 3.12
aware  = datetime.now(tz=timezone.utc)            # modern correct form
local  = datetime.now(tz=ZoneInfo("Asia/Jerusalem"))
```

The footgun: **naive and aware datetimes cannot be compared**.

```python
naive < aware
# TypeError: can't compare offset-naive and offset-aware datetimes
```

The convention every back-end follows: **store UTC-aware datetimes, convert to local only at display time**. `datetime.utcnow()` is a trap because it gives you UTC numerically but throws the tz info away — so the next comparison with an aware value blows up.

---

## Concept 2 — Parsing and formatting

Two directions, mirrored:

- `dt.strftime(format)` — datetime → string.
- `datetime.strptime(string, format)` — string → datetime.

Format codes worth memorizing: `%Y %m %d %H %M %S %f` (microseconds), `%z` (offset like `+0300`), `%Z` (name like `IDT`), `%a` (weekday). Mismatched format → `ValueError`.

For ISO 8601 strings — the format every modern API speaks — prefer the dedicated methods:

```python
dt = datetime.fromisoformat("2026-05-12T14:30:00+03:00")   # aware, no format string needed
s  = dt.isoformat()                                        # round-trips
```

`fromisoformat()` is faster, easier to read, and handles offsets natively. Reach for `strptime` only when parsing a non-ISO format.

---

## Concept 3 — `timedelta` arithmetic

`timedelta` is the duration type. The three operations to know cold:

```python
datetime + timedelta   →  datetime
datetime - datetime    →  timedelta
timedelta.total_seconds()  →  float
```

```python
from datetime import datetime, timedelta, timezone

now    = datetime.now(tz=timezone.utc)
cutoff = now - timedelta(days=7)

# "find logs older than a week"
old = [log for log in logs if log.created_at < cutoff]
```

`timedelta` accepts negative values (`timedelta(days=-1)` is yesterday). It does **not** accept months or years — neither has a fixed length. For "one month later", reach for `dateutil.relativedelta`, not stdlib.

---

## Concept 4 — Monotonic timers

You measure duration with `time.perf_counter()`, **never** `time.time()`.

```python
import time

start = time.perf_counter()
do_work()
elapsed = time.perf_counter() - start
```

Why: `time.time()` returns Unix epoch seconds, which the operating system can adjust backward — NTP sync, manual clock changes, daylight saving on some systems. If the clock moves back during your measurement, `elapsed` goes negative.

`time.perf_counter()` is monotonic and high-resolution — guaranteed never to decrement, regardless of what happens to the wall clock. `time.monotonic()` is the lower-resolution sibling; use it for timeout logic where nanoseconds don't matter.

`time.sleep(seconds)` blocks the calling thread; it accepts floats (`time.sleep(0.25)` is fine) and is what every "retry with backoff" loop is built on.

---

## Quick check before you run cards

Before practicing, make sure you can answer these out loud:

1. Why is `datetime.utcnow()` deprecated, and what's the modern replacement?
2. What happens if you compare a naive and an aware datetime?
3. Why measure durations with `perf_counter` instead of `time.time`?
4. Convert "two weeks ago" into a `datetime` in one expression.

If any of those four feels shaky — re-read that section, then start the cards.
