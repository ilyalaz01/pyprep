---
module_id: 2
sphere_id: "m2-s1"
title: "Filesystem & OS"
title_ru: "Файловая система и OS"
estimated_minutes: 12
prerequisites: []
tags: ["pathlib", "os", "shutil", "env-vars", "exit-codes", "interview-classic"]
---

# Filesystem & OS

Every automation script eventually has to find files, create directories, read a secret, and tell its CI system whether it succeeded. The Python that ships into production uses `pathlib` for paths, `os.environ` for secrets, and a non-zero exit code to fail loudly.

## Why this matters in interviews

The interviewer is checking whether you can write a script that runs unattended. Code that hardcodes `/etc/something`, calls `os.path.join` like it's 2014, or `print("error")`-s into the void instead of `sys.exit(1)`-ing marks you as someone who only runs scripts from PyCharm. An interviewer can clock all of this in a 30-line script review.

---

## Concept 1 — `pathlib` over `os.path.join`

`pathlib.Path` is the modern way. Use the `/` operator to compose paths and Path methods for component access:

```python
from pathlib import Path

logs = Path.home() / "projects" / "myapp" / "logs"
print(logs.exists(), logs.is_dir(), logs.resolve())

f = Path("/var/log/app.log")
f.parent, f.name, f.stem, f.suffix, f.parts
# (PosixPath('/var/log'), 'app.log', 'app', '.log', ('/', 'var', 'log', 'app.log'))
```

Why prefer it: `/` reads naturally, returns a typed `Path`, works cross-platform, and gives `.exists()` / `.is_file()` / `.is_dir()` as methods on the path.

---

## Concept 2 — Walking directories: `iterdir`, `glob`, `rglob`

Three tools, one rule each:

```python
for child in Path(".").iterdir():        # direct children, files + dirs
    print(child)

for log in Path("logs").glob("*.log"):   # current dir only, pattern match
    ...

for log in Path("logs").rglob("*.log"):  # recursive across all subtrees
    ...
```

Pattern syntax: `*` is any characters except `/`; `**` is any depth; `?` is one character; `[abc]` is a character class. All three return `Path` objects, not strings.

The interview question lives in `rglob`: "find every `.log` file under here, no matter how deep" → `Path(root).rglob("*.log")`. One line.

---

## Concept 3 — Create, copy, delete

The vocabulary every script shares:

```python
import os, shutil

os.makedirs("data/2026/05", exist_ok=True)   # idempotent — no error if exists
shutil.copy("src.txt", "dest.txt")           # copies content + permissions
shutil.copy2("src.txt", "dest.txt")          # copy + metadata (mtime, etc.)
shutil.move("old.txt", "archive/old.txt")    # move or rename
shutil.rmtree("build/")                      # recursive delete — equivalent of rm -rf
```

Two things to memorize:

1. **`exist_ok=True` is the no-race-condition pattern.** Naive `if not exists: makedirs()` has a TOCTOU race between the check and the create. `exist_ok=True` is atomic at the OS level.
2. **`shutil.rmtree` is `rm -rf` in disguise.** It has no confirmation, no "are you sure", no undo. If `path` is built from untrusted input, validate before passing it in.

---

## Concept 4 — Environment variables and secrets

Hardcoding an API key into source is a fireable offense at any company that audits commits. The standard pattern:

```python
import os

api_key = os.environ.get("API_KEY")          # returns None if absent
required = os.environ["API_KEY"]             # raises KeyError if absent — for mandatory secrets
default  = os.getenv("API_KEY", "anonymous") # alternative with explicit default
```

`os.environ.get(...)` and `os.getenv(...)` are interchangeable; pick one and stay consistent. Use the `[]` form when a missing value is a startup-time error worth crashing on.

For local development, `python-dotenv`'s `load_dotenv()` reads `.env` files into `os.environ`. In production, secrets come from the orchestrator (Kubernetes secrets, Vault, GitHub Actions secrets) — never from a file in source.

---

## Concept 5 — Exit codes

CI/CD systems read your script's exit code, not its log output. `0` means success; non-zero means failure. The minimum-viable shape:

```python
import sys

def main() -> int:
    try:
        run_job()
    except Exception as e:
        print(f"fatal: {e}", file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

`sys.exit(0)` is the implicit default. `sys.exit(1)` is the generic failure — Jenkins, GitHub Actions, and every other runner reads it and marks the job red. `sys.exit(n)` raises `SystemExit`, which a bare `except:` will swallow; keep your handlers specific.

---

## Quick check before you run cards

Make sure you can answer these out loud:

1. Why is `Path("a") / "b"` better than `os.path.join("a", "b")`?
2. What's the difference between `glob("*.log")` and `rglob("*.log")`?
3. Why `os.makedirs(p, exist_ok=True)` instead of `if not p.exists(): os.makedirs(p)`?
4. What does `os.environ["API_KEY"]` do when the variable is missing, and when is that the right behavior?
5. How does your script tell a CI runner that it failed?

If any of those five feels shaky — re-read that section, then start the cards.
