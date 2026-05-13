---
module_id: 2
title: "Practical Automation, Scripting & Infrastructure"
title_ru: "Практическая автоматизация, скрипты и инфраструктура"
estimated_minutes: 7
prerequisites: ["m1-s0", "m1-s1"]
tags: ["automation", "scripting", "stdlib", "fastapi"]
---

# Module 2 — Practical Automation, Scripting & Infrastructure

Module 1 taught you to *reason about* Python. Module 2 teaches you to *do work with it*. Israeli automation positions blend QA, DevOps-lite, and scripting into a single role — and the interview screens reflect that. Expect to be asked to parse a log file, hit an API with auth, run a subprocess safely, or wire a FastAPI endpoint, often in the same screen.

## What this module covers

Eight spheres, taught in order:

1. **Time, Dates & Math** — naive vs aware datetimes, `timedelta`, monotonic timers. Where automation scripts most often break.
2. **Filesystem & OS** — `pathlib`, `glob`, `os.environ`, `sys.exit`. The vocabulary every script shares.
3. **Text & Regex** — `re` patterns, capturing groups, `re.compile`. Log parsing is most of "scripting" in practice.
4. **Serialization Formats** — JSON, CSV, YAML. Including why `yaml.safe_load` is non-negotiable.
5. **Network & APIs** — `requests`, headers and auth, timeouts, `pydantic` response models.
6. **Subprocess** — `subprocess.run` with arg lists, capturing output, `check=True`. No `shell=True`, ever.
7. **Production-grade Scripts** — `argparse`, `logging`, why `print()` doesn't ship.
8. **Modern Backend Basics** — FastAPI routing, Pydantic models, `Depends`, async endpoints.

## How to work through it

Same pattern as Module 1:

1. Read the lesson once, end to end. Skim and you'll miss the why.
2. Run the cards. Rate honestly — `Again` if you needed the answer, `Hard` if you got there slowly, `Good` if it came naturally, `Easy` if it was instant.
3. Come back tomorrow. The scheduler resurfaces what you struggled on.

Some spheres lean heavier on `code_trap` and `multiple_choice` than Module 1 did — that's by design. Subprocess, networking, and OS-level work don't run cleanly inside the Pyodide browser sandbox (no real filesystem, no real network), so those concepts are drilled by reading code and predicting behavior rather than by executing it. The interview itself is mostly verbal; this mirrors that.

## What "done" with this module looks like

You can:

- Walk through a 30-line automation script and explain what each stdlib call costs and why.
- Parse a log line with a named-group regex on the first try.
- Hit an authenticated API with `requests`, handle timeouts and non-2xx responses without crashing the script.
- Wire a minimal FastAPI endpoint with a Pydantic request model and a `Depends`-injected dependency, from memory.
- Explain why `subprocess.run([..., shell=True])` is the line in your code review that the senior engineer circles in red.

Once that's true, the platform marks this module `mastered` and de-prioritizes it in your review queue.
