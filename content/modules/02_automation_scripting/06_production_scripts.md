---
module_id: 2
sphere_id: "m2-s6"
title: "Production-grade Scripts"
title_ru: "Production-grade скрипты"
estimated_minutes: 11
prerequisites: ["m2-s1"]
tags: ["argparse", "logging", "production", "cli", "interview-classic"]
---

# Production-grade Scripts

The leap from "script that works on my laptop" to "script that runs as a scheduled job in production" is a competence marker every interviewer probes. A script with hardcoded paths and `print()` statements works on a laptop; the same script in production is unsearchable, unfilterable noise that nobody can debug at 2am. Two stdlib modules close most of the gap: `argparse` for CLI inputs, `logging` for observable output.

## Why this matters in interviews

The interviewer is checking whether you'd ship code that the on-call engineer can operate. `print("starting job")` works locally, looks fine in code review, and is operationally invisible the moment it hits production — no timestamp, no level, no module name, no integration with the log-aggregation tool the team actually uses. The audit is verbal: a senior engineer can spot `print` in a script under a second and treat it as evidence the candidate has never been on-call.

---

## Concept 1 — `argparse`: required, optional, boolean

The canonical shape:

```python
import argparse

parser = argparse.ArgumentParser(description="Process a log file.")
parser.add_argument("input_file")                                # positional, required
parser.add_argument("--output", "-o", default="out.txt")         # optional with default
parser.add_argument("--verbose", "-v", action="store_true")      # boolean flag
parser.add_argument("--workers", type=int, default=4)            # type coercion
parser.add_argument("--mode", choices=["fast", "slow"])          # restricted values

args = parser.parse_args()
# args.input_file, args.output, args.verbose, args.workers, args.mode
```

The one trap interviewers love: **`action="store_true"` for boolean flags, not `type=bool`**. `type=bool` is broken because `bool("False")` is `True` (any non-empty string is truthy in Python). `action="store_true"` makes `--verbose` set the value to `True` when present, `False` when absent — the actual semantics you wanted.

`parser.parse_args()` reads from `sys.argv` by default; pass a list explicitly (`parser.parse_args(["--input", "x"])`) when testing.

---

## Concept 2 — `logging`: levels, format, `logger.exception`

The standard one-time setup at the top of a script:

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)
```

Then per-module use `logger.info(...)`, `logger.warning(...)`, `logger.error(...)`. Levels in order: `DEBUG < INFO < WARNING < ERROR < CRITICAL`. The `level=` you pass to `basicConfig` is the *minimum* that gets through.

The card every interview asks: **how do you log the full traceback when catching an exception?**

```python
try:
    risky()
except Exception:
    logger.exception("risky() failed")     # logs message AND traceback
```

`logger.exception(msg)` is `logger.error(msg)` plus the traceback of the *currently handled* exception. Call it from inside an `except` block, with no `str(e)` interpolation. The common junior mistake is `logger.error(str(e))` — that logs just the exception message and silently drops the stack trace, leaving production with "ValueError: bad input" and no clue where it came from.

---

## Concept 3 — Why `print` is forbidden

`print("starting job")` ships:

- No **timestamp** — you can't correlate the line with anything else in your log stream.
- No **level** — `print` is implicitly "INFO and you can't filter for ERROR".
- No **module name** — you can't tell which file the message came from.
- No **routing** — every line goes to stdout; you can't send errors to one place and info to another.
- No **aggregation integration** — Datadog, ELK, Splunk, CloudWatch all read structured log records, not bare stdout text.

In sum: `print` output is unsearchable, unfilterable, undated noise. The on-call engineer reading the box at 2am gets nothing useful from it.

Even debug `print`s should be `logger.debug(...)` — that way they're off by default in production but flippable on via `level=logging.DEBUG` when you need them. CLI output meant for humans at the terminal (the actual answer of a one-shot script) is the one place `print` is still appropriate; everything else is `logger`.

---

## Quick check before you run cards

Make sure you can answer these out loud:

1. Why `action="store_true"` for a `--verbose` flag instead of `type=bool`?
2. What's the difference between `logger.error(str(e))` and `logger.exception("...")` inside an `except` block?
3. Name three things `print` doesn't carry that a `logger` record does.
4. What does `level=logging.INFO` in `basicConfig` actually do?
5. When is `print` still the right call in 2026 production Python?

If any of those five feels shaky — re-read that section, then start the cards.
