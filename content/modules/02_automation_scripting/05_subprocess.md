---
module_id: 2
sphere_id: "m2-s5"
title: "Subprocess"
title_ru: "Subprocess"
estimated_minutes: 11
prerequisites: ["m2-s1"]
tags: ["subprocess", "shell-injection", "security", "process-management", "interview-classic"]
---

# Subprocess

When Python doesn't have a library for some tool — `kubectl`, `git`, `ffmpeg`, an internal CLI — automation scripts shell out via `subprocess`. The mechanics are small (one function: `subprocess.run`) and the security implications are large (one keyword argument can turn a 30-line script into a remote-code-execution vector).

## Why this matters in interviews

The interviewer is checking exactly one thing: whether you reach for `shell=True` reflexively. A candidate who writes `subprocess.run(f"git checkout {branch}", shell=True)` with `branch` coming from user input has just written the most common security finding in any code audit. A candidate who writes `subprocess.run(["git", "checkout", branch])` has not. The audit is a single line, and the interviewer can spot the difference in under a second.

---

## Concept 1 — Arg list, not `shell=True`

Two ways to call a command. Only one is safe by default:

```python
import subprocess

# SAFE: arg list. The OS exec call gets the args directly; no shell parsing.
subprocess.run(["git", "checkout", branch])

# DANGEROUS: shell=True with string. The shell interprets the whole string —
# including spaces, semicolons, $(...) substitution, pipes.
subprocess.run(f"git checkout {branch}", shell=True)
```

If `branch` is `"main; rm -rf ~"`, the first call runs `git checkout 'main; rm -rf ~'` (git complains, nothing else happens). The second call runs `git checkout main`, then a separate shell command `rm -rf ~`. The script gives an attacker a shell.

**Rule:** default to arg list. Reach for `shell=True` only when you genuinely need shell features (pipes `|`, globs `*.log`, env-var expansion `$HOME`) and *every* input is either a string literal or escaped with `shlex.quote(s)`. The cleanest fix is almost always to drop `shell=True` and structure the work as multiple `subprocess.run([...])` calls.

---

## Concept 2 — Capturing output: `capture_output=True, text=True`

The modern idiomatic form:

```python
result = subprocess.run(
    ["git", "status", "--porcelain"],
    capture_output=True,   # grab stdout AND stderr
    text=True,             # decode to str (not bytes)
)

print(result.stdout)       # the captured stdout, as a string
print(result.stderr)       # the captured stderr, as a string
print(result.returncode)   # exit code, int
```

Two flags do all the work. Without `capture_output=True`, the child's stdout/stderr go to the parent's stdout/stderr (visible but not captured). Without `text=True`, `result.stdout` is `bytes`, not `str` — comparing `result.stdout == "expected"` then silently returns `False` because `b"expected" != "expected"`.

The older `subprocess.check_output(args)` shape still works — it returns stdout, raises on non-zero — but `run(args, capture_output=True, text=True, check=True)` is the modern one-stop call. Use it as the default.

For streaming / interactive scenarios where you need to read output as it appears (or send input to the child), drop down to `subprocess.Popen` with `stdout=PIPE`, `stdin=PIPE`, and `communicate()`. But 95% of scripts use `run` and don't need more.

---

## Concept 3 — `check=True` and `CalledProcessError`

By default, `subprocess.run` does **not** raise on a failed command — it returns a `CompletedProcess` with a non-zero `returncode` and your script happily continues. This is the silent-failure pattern that breaks CI pipelines: `kubectl apply` returned 1, the script kept going, no log line, no exit, the deploy step is "green" in Jenkins.

The fix is one keyword:

```python
try:
    subprocess.run(["kubectl", "apply", "-f", "deploy.yml"],
                   check=True, capture_output=True, text=True, timeout=60)
except subprocess.CalledProcessError as e:
    log.error("kubectl apply failed (rc=%d): %s", e.returncode, e.stderr)
    raise
```

`check=True` raises `subprocess.CalledProcessError` on any non-zero exit. The exception carries `.returncode`, `.cmd` (the args you passed), `.output` / `.stdout`, and `.stderr` — exactly what you want to log. The `timeout=60` is the same survival kit as in `requests`: without it, a hung child process hangs the parent forever.

Treat `check=True` as the default for every `subprocess.run` call. Failures should be loud and exception-shaped, not buried in a returncode field the script forgot to read.

---

## Quick check before you run cards

Make sure you can answer these out loud:

1. Why is `subprocess.run(cmd_str, shell=True)` dangerous when `cmd_str` contains user input?
2. What's the canonical fix — `shlex.quote`, arg list, both?
3. Why pass `text=True` to `subprocess.run`?
4. What happens if you forget `check=True` and the command exits non-zero?
5. What attributes does `CalledProcessError` carry?

If any of those five feels shaky — re-read that section, then start the cards.
