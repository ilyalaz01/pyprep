---
module_id: 4
title: "Linux, Docker, SQL, Git, Tooling & Operations"
title_ru: "Linux, Docker, SQL, Git, тулинг и эксплуатация"
estimated_minutes: 8
prerequisites: ["m1-s0", "m2-s1"]
tags: ["linux", "docker", "sql", "git", "tooling", "security", "ci-cd", "bash"]
---

# Module 4 — Linux, Docker, SQL, Git, Tooling & Operations

This module is the operational toolkit. Every Israeli student-position interview screens for *some* of it; most screen for *all* of it. A candidate who can write Python but freezes on `grep -i 'error' app.log | wc -l`, can't read a `Dockerfile`, doesn't know the difference between `INNER JOIN` and `LEFT JOIN`, or can't explain what `set -euo pipefail` protects against — that candidate signals "I've never run code outside an IDE." The bar isn't deep; it's broad.

## What this module covers

Ten spheres:

1. **Networking Fundamentals** — IP/ports, TCP vs UDP, DNS, HTTP anatomy, status codes.
2. **Linux CLI Basics** — `pwd`, `ls`, `cd`, `cp`, `mv`, permissions, `sudo`.
3. **Linux Operations** — `cat`/`tail`/`grep`/`awk`, redirection, process tools, disk/memory.
4. **Docker** — image vs container, `Dockerfile`, `CMD` vs `ENTRYPOINT`, port/volume mapping.
5. **SQL** — `SELECT`/`WHERE`, mutations, aggregates, `GROUP BY`, joins.
6. **Git** — workflow, diff/status/restore, branches, `merge` vs `rebase`.
7. **Python Tooling** — venvs, `pip`/`uv`/`poetry`, `ruff`/`black`/`mypy`, Big-O lite.
8. **Web Security Basics** — SQL injection, password hashing, JWT vs sessions, OAuth, CORS, HTTPS.
9. **CI/CD Pipelines** — GitHub Actions, secrets, caching, matrix builds.
10. **Bash Scripting Basics** — variables/quoting, conditionals, loops, exit codes, `read`, functions.

## How to work through it

Same pattern as Modules 1–3:

1. Read the lesson once, end to end.
2. Run the cards. Rate honestly.
3. Come back tomorrow. The scheduler resurfaces what you struggled on.

Module 4 leans heavier on `code_trap` / `multiple_choice` / `flip` than earlier modules. Most of the topics here are operationally meaningful (does this `rm -rf` work the way you expect?) rather than function-shaped, so predict-the-behavior is the dominant pedagogy. Spheres `m4-s7` (security) and `m4-s8` (CI/CD) get the heaviest gotcha treatment — SQL injection, password hashing, GitHub Actions YAML traps are interview-frequent and ship-into-production-real.

## What "done" with this module looks like

You can:

- Walk through a DNS resolution of `google.com` from browser cache to authoritative server.
- Explain the difference between `INNER JOIN` and `LEFT JOIN` with a one-line example.
- Read a 20-line `Dockerfile` and explain what each instruction does and why.
- Diagnose `git rebase` conflicts and `merge` history-shape trade-offs out loud.
- Write a parametrized SQL query without thinking about injection (because you'd never write the alternative).
- Hash a password with bcrypt, never MD5 or plaintext, and know why each rule exists.
- Author a GitHub Actions workflow with a matrix build, a cached dependency step, and a secret reference.
- Write a `bash` script that starts with `set -euo pipefail` reflexively and exits non-zero on the first error.

Once that's true, the platform marks this module `mastered`.
