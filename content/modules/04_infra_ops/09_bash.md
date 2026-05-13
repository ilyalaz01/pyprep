---
module_id: 4
sphere_id: "m4-s9"
title: "Bash Scripting Basics"
title_ru: "Основы Bash"
estimated_minutes: 16
prerequisites: ["m4-s1", "m4-s2"]
tags: ["bash", "shell", "scripting", "set-e", "quoting", "automation", "interview-classic"]
---

# Bash Scripting Basics

Automation engineers regularly read and write small bash scripts — CI helpers, deployment scripts, ad-hoc data manipulation, glue between Python tools. The bar isn't "be a bash expert"; it's "can you follow what an existing 50-line script does, and write a 20-line one yourself without subtle bugs?". Skipping this leaves a noticeable gap in automation-role interviews and limits what you can do in CI / Dockerfile / deploy contexts where bash is the lingua franca.

## Why this matters in interviews

The probes are mechanical: "what does `$VAR` versus `\"$VAR\"` change?" (quoting prevents word splitting and glob expansion — almost always want quoted); "make this script fail fast on any error" (`set -euo pipefail` at the top); "process this file line by line" (`while IFS= read -r line; do ...; done < file`); "how do you return a string from a function?" (echo to stdout, capture with `$(func_name)`); "what does `[[ -f \"$path\" ]]` test?" (regular file exists at `$path`). Senior candidates write `set -euo pipefail` reflexively as the first line of every script and quote every variable expansion. Junior candidates write scripts that "usually work" until they meet a filename with a space or an unset variable, then break in surprising ways.

---

## Concept 1 — Variables and quoting

```bash
NAME=alice               # assignment (NO spaces around =)
echo "$NAME"             # expansion (quoted — almost always what you want)
echo "${NAME}_suffix"    # braces required when followed by alphanumerics
echo '$NAME'             # SINGLE quotes: literal — prints `$NAME`, no expansion

# Command substitution:
TODAY=$(date +%Y-%m-%d)  # modern form
TODAY=`date +%Y-%m-%d`   # legacy backticks — avoid

# Arithmetic:
SUM=$((5 + 3))           # SUM=8

# Default values (parameter expansion):
NAME=${1:-anonymous}     # use $1 if set, else "anonymous"
NAME=${REQUIRED:?must be set}   # fail with message if REQUIRED unset/empty
```

**Special parameters:**

- `$0` — script name
- `$1`, `$2`, ... — positional args
- `$#` — number of args
- `$@` — all args (each as a separate word when quoted: `"$@"`)
- `$*` — all args (concatenated into one word when quoted)
- `$?` — exit code of last command
- `$$` — current shell's PID

**The single rule that prevents most bash bugs: ALWAYS quote variable expansions** — `"$NAME"`, not `$NAME`. An unquoted variable undergoes:

1. **Word splitting** — `$NAME` becomes multiple tokens if the value contains spaces. `cp $SRC $DEST` with `SRC="my file.txt"` becomes `cp my file.txt $DEST` — three arguments instead of two; `cp` errors.
2. **Glob expansion** — `$NAME` is treated as a glob pattern if it contains `*`, `?`, or `[`. `rm $NAME` with `NAME="*"` becomes `rm *` — disaster.

Quoting (`"$NAME"`) suppresses both. The rule is reflexive: write `"$VAR"` every time, unless you specifically want word splitting (rare).

---

## Concept 2 — Conditionals: `if`, `[[ ]]`, file tests

```bash
if [[ "$NAME" == "alice" ]]; then
  echo "hi alice"
elif [[ "$NAME" == "bob" ]]; then
  echo "hi bob"
else
  echo "stranger"
fi

# File tests:
if [[ -f "$path" ]]; then echo "regular file exists"; fi
if [[ -d "$path" ]]; then echo "directory exists"; fi
if [[ -r "$path" ]]; then echo "readable"; fi
if [[ -x "$path" ]]; then echo "executable"; fi

# Numeric vs string comparison:
[[ "$AGE" -eq 18 ]]      # NUMERIC equality
[[ "$NAME" == "alice" ]]  # STRING equality
[[ "$NAME" =~ ^[a-z]+$ ]] # REGEX match (modern bash only)

# Short-circuit chains:
mkdir -p /opt/app && cp config.yml /opt/app/   # cp only runs if mkdir succeeded
make || echo "build failed"                     # echo only runs if make failed
```

**`[[ ]]` vs `[ ]`:**

- **`[[ ]]`** (double brackets) — modern bash test. Supports `==`, `!=`, `=~` (regex), `<`, `>` (string comparison), `&&`, `||` inside. **Does NOT perform word splitting or glob expansion on unquoted vars** (so `[[ $UNQUOTED == 'value' ]]` is safer than `[ $UNQUOTED = 'value' ]`). Bash-specific (not POSIX).
- **`[ ]`** (single brackets, alias for `test`) — POSIX shell test. Works in `sh`, `dash`, `bash`. More limited; uses `=` instead of `==`; no regex; no `&&` / `||` inside.

**Use `[[ ]]` for any bash script** unless you specifically need POSIX-shell compatibility. Test scripts with `bash -n script.sh` for syntax-only checks and `shellcheck script.sh` for static analysis.

**The numeric-vs-string distinction is a footgun.** `[[ "$AGE" == 18 ]]` is *string* equality — it works for `AGE=18` but not for `AGE=018` (which is the string `"018"`, not equal to `"18"`). For numbers, use `-eq`, `-ne`, `-lt`, `-le`, `-gt`, `-ge`. For strings, `==` and `!=`.

---

## Concept 3 — Loops: `for`, `while`, `read`

```bash
# For loop over a list of items:
for item in apple banana cherry; do
  echo "$item"
done

# For loop over files (glob expansion):
for f in *.log; do
  process "$f"
done

# C-style for loop (numeric range):
for ((i=0; i<10; i++)); do
  echo "$i"
done

# While loop with condition:
count=0
while [[ "$count" -lt 10 ]]; do
  echo "$count"
  count=$((count + 1))
done

# Reading a file line by line (canonical idiom):
while IFS= read -r line; do
  echo "got: $line"
done < input.txt
```

**The `for line in $(cmd)` anti-pattern:**

```bash
# WRONG — silently word-splits on whitespace and globs:
for line in $(cat file.txt); do
  echo "line: $line"
done
```

`$(cat file.txt)` returns the entire file as a string; the unquoted command substitution then word-splits on every whitespace character (spaces, tabs, newlines) — `for` iterates over tokens, NOT lines. A file with `hello world` produces two iterations (`hello` and `world`), not one. Also undergoes glob expansion, so `*` in the file becomes a directory listing.

**The right idiom is `while IFS= read -r line`:**

- **`IFS=`** (empty internal field separator) — prevents `read` from stripping leading/trailing whitespace.
- **`-r`** — raw mode; prevents `read` from interpreting backslash escapes (e.g., `\n` stays as literal backslash-n, not newline).
- **`< input.txt`** — redirect file to stdin so `read` consumes from it.

Memorize the full incantation: `while IFS= read -r line; do ...; done < file`. It's the only line-by-line loop that handles real-world filenames, whitespace, and special characters correctly.

---

## Concept 4 — Exit codes + `set -euo pipefail`

```bash
#!/usr/bin/env bash
set -euo pipefail

# Every command returns an exit code:
#   0 = success
#   non-zero = failure (different non-zero values mean different errors)
# $? holds the exit code of the last command:

ls /nonexistent
echo "exit code was: $?"     # prints "exit code was: 2"

# Allowing expected failures explicitly:
grep TODO file.txt || true   # don't exit-fail if grep finds nothing (exit 1)

# Custom exit:
if [[ ! -f config.yml ]]; then
  echo "config missing" >&2
  exit 1
fi
```

**Bash DEFAULTS to "continue after failure"** — if a command in the middle of your script fails, the script keeps running. This is the wrong default for production scripts; you almost always want fail-fast behavior.

**`set -euo pipefail` is the production-script standard. Three flags:**

- **`set -e` (errexit)** — exit immediately on any non-zero exit. Without it, a failing `cp` continues to the next line as if nothing happened.
- **`set -u` (nounset)** — error on use of an unset variable. Catches typos: `echo "$NAEM"` (typo for `$NAME`) errors instead of silently echoing empty string. Cross-link to `m4-s1-c6`: `set -u` is the defense against `rm -rf $UNSET_VAR/path` becoming `rm -rf /path`.
- **`set -o pipefail`** — the pipeline's exit code becomes the rightmost non-zero exit, not just the last command's. Without it, `cmd_that_fails | sort` exits 0 (sort succeeded) and `set -e` doesn't fire.

Write `set -euo pipefail` as the first non-shebang line of every script as a reflex. The pattern is so canonical that production scripts without it are flagged in code review.

**Escape hatches when you need a command to be allowed to fail:**

```bash
command || true                       # explicitly allow failure
if ! command; then echo "fallback"; fi   # branch on failure
RESULT=$(command || echo "default")   # capture with fallback
```

`set -e` interacts with `||` and `&&` chains: a command in a `&&` / `||` chain is "tested" rather than "asserted", so its failure doesn't trigger errexit. This is a useful interaction once you know it; surprising the first time it bites.

---

## Concept 5 — Reading input, redirection, pipes

```bash
# Reading from stdin (interactive prompts):
read -p "Continue? " ANSWER          # -p prints prompt before reading
read -s PASSWORD                     # -s silent (no echo) — for passwords
read -t 5 -p "Quick: " RESPONSE      # -t timeout in seconds

# Heredoc (multi-line literal input):
cat <<EOF
This is
multi-line
text
EOF

# Heredoc with NO expansion (literal $VAR):
cat <<'EOF'
$NAME is literal
EOF

# Here-string (single-line stdin):
grep "ERROR" <<< "$LOG_LINE"

# File redirection:
command > out.log                    # overwrite
command >> out.log                   # append
command 2> err.log                   # stderr only
command > all.log 2>&1               # stdout + stderr (note ORDER — see m4-s2-c9)
command > /dev/null 2>&1             # discard everything

# tee — write to file AND stdout:
command | tee out.log                # stdout goes to terminal AND file
command | tee -a out.log             # -a append instead of overwrite
```

**`tee` is the answer to "save command output to a file while also seeing it in the terminal"** — useful for debugging long-running commands where you want to follow progress live but also archive the full output.

**`> /dev/null 2>&1`** is the canonical "throw away all output" — `/dev/null` is a special file that discards everything written to it. The `2>&1` makes stderr go where stdout currently goes (`/dev/null`); ordering matters here, same as `m4-s2-c9`.

---

## Concept 6 — Functions: definition, `local`, return semantics

```bash
greet() {
  local name="$1"           # local — variable scoped to function
  local greeting="${2:-Hello}"
  echo "$greeting, $name"
}

greet "Alice"               # prints "Hello, Alice"
greet "Bob" "Hi"            # prints "Hi, Bob"

# Capture function output:
result=$(greet "Carol")
echo "captured: $result"

# Function exit code (not return value):
is_root() {
  [[ "$EUID" -eq 0 ]]       # last command's exit code is the function's
}

if is_root; then
  echo "running as root"
fi
```

**`local` is critical.** Without it, every variable inside a function is *global* — it persists into the caller's scope after the function returns, overwriting any same-named variable. Forgetting `local` is one of the most common bash bugs: `function_a` modifies `result` for its own use; `function_b` (which called `function_a` and uses its own `result`) suddenly sees `function_a`'s value bleed through.

```bash
# Common bug — missing local:
process() {
  result="processed"        # NOT local — leaks to caller
  echo "$result"
}

result="original"
process > /dev/null
echo "$result"               # prints "processed", not "original"
```

**Functions don't return values like Python — they return exit codes.** A "return value" is conventionally:

1. **Print to stdout** in the function; caller captures with `$(func_name args)`. The canonical pattern for returning data.
2. **Set a global variable** (avoid; defeats encapsulation but sometimes practical).
3. **`return N`** sets the function's exit code (0–255 integer; for signaling success/failure, not data).

**Arguments** to a function use the same syntax as script args: `$1`, `$2`, `$@`, `$#`. `$0` inside a function is still the script name, not the function name (use `${FUNCNAME[0]}` for that).

---

## Quick check before you run cards

1. `cp $SRC $DEST` where `SRC="my file.txt"`. Why does this fail, and what's the fix?
2. Write the first non-shebang line of every production script you'd ever ship. Name what each flag protects against.
3. `for line in $(cat file.txt)` — what's wrong with this loop, and what's the right replacement?
4. Inside a function, you assign `result="foo"`. Why does this break the caller's `result` variable?
5. `[[ "$AGE" == 18 ]]` vs `[[ "$AGE" -eq 18 ]]` — when does the difference matter?
6. You want to save `make`'s output to `build.log` AND see it in the terminal as it runs. What's the command?

If any feels shaky — re-read that section, then start the cards.
