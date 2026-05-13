---
module_id: 4
sphere_id: "m4-s2"
title: "Linux Operations"
title_ru: "Эксплуатация Linux"
estimated_minutes: 14
prerequisites: ["m4-s1"]
tags: ["linux", "logs", "grep", "awk", "find", "processes", "redirection", "pipes", "interview-classic"]
---

# Linux Operations

This is where the rubber meets the road. Reading logs, finding runaway processes, piping commands to extract counts — the day-to-day work that backend / QA / automation roles do before they touch a debugger. Senior engineers expect candidates to write a line like `grep "ERROR" app.log | awk '{print $3}' | sort | uniq -c | sort -rn` without looking it up, and to explain each stage out loud. Sphere `m4-s1` was navigation; this sphere is operation.

## Why this matters in interviews

"You SSH'd into the prod box. The app is misbehaving. What do you check?" is a screening question — not a deep one, but binary. The expected reflexes: `tail -f /var/log/app.log` (live), `ps aux | grep myapp` (running?), `df -h` (disk full?), `free -h` (memory?), `grep ERROR app.log | tail -100` (recent failures). A candidate who reaches for these in seconds passes; one who hesitates fails. The probe is operational fluency, not cleverness.

---

## Concept 1 — Viewing files: `cat`, `less`, `head`, `tail`

```bash
cat file.log                 # print whole file to stdout
less file.log                # paginated viewer; `/pattern` search, `G` end, `q` quit
head -n 20 file.log          # first 20 lines
tail -n 50 file.log          # last 50 lines
tail -f /var/log/app.log     # FOLLOW: keep reading as the file grows
tail -F /var/log/app.log     # follow + handle log ROTATION (re-open by name)
```

`cat` is for small files. On a 2 GB log it dumps two gigabytes through your terminal — `less` is what you actually want for "open this large file and look around". `tail -f` is the live-tail every operator uses; `tail -F` is its production-grade cousin: when log rotation renames `app.log` to `app.log.1` and creates a fresh `app.log`, plain `-f` keeps reading the *rotated* file forever (no new output), while `-F` notices the inode change and re-opens.

---

## Concept 2 — `find`: files by name, age, size

```bash
find /var/log -name "*.log"                  # by pattern
find /var/log -type f                        # only files (-type d for dirs)
find /var/log -mtime +7                      # MODIFIED more than 7 days ago
find /var/log -mtime -7                      # modified WITHIN the last 7 days
find /var -size +100M                        # larger than 100 MB
find /tmp -name "*.tmp" -delete              # find AND delete (dangerous)
find /tmp -name "*.tmp" -exec rm {} \;       # same effect, per-result exec
```

The two `find` traps:

- **The sign on `-mtime`.** `+7` means *more than* 7 days; `-7` means *less than* 7 (i.e. recent); plain `7` means exactly 7. The most common interview slip is reading `+7` as "the last week" — it's the opposite.
- **Test before `-delete`.** Run `find ... -name "*.tmp"` first, eyeball the output, *then* add `-delete`. Adding `-delete` to a wrong glob in `/` is the same incident shape as `rm -rf`.

---

## Concept 3 — Redirection: `>`, `>>`, `|`, `2>&1`

```bash
command > out.log            # stdout overwrite (truncates existing file!)
command >> out.log           # stdout append
command 2> err.log           # stderr only
command > all.log 2>&1       # both stdout + stderr to all.log
command1 | command2          # pipe: cmd1 stdout → cmd2 stdin
command < input.txt          # stdin from file
```

**`>` truncates.** `echo "new" > app.log` wipes whatever was in `app.log` before. Use `>>` when you mean append (logs, accumulating output).

**`2>&1` ordering matters.** `> file 2>&1` works (stdout to file, then stderr to wherever stdout points → file). `2>&1 > file` does NOT — `2>&1` runs first when stderr still points to the terminal, so stderr stays on the terminal while stdout goes to the file. Memorize the working form: **redirect stdout first, then `2>&1`**.

---

## Concept 4 — `grep` and `awk`: search and column extraction

```bash
grep "ERROR" app.log              # lines matching ERROR
grep -i "error" app.log           # case-insensitive
grep -v "DEBUG" app.log           # INVERT: lines NOT matching
grep -r "TODO" .                  # recursive across files
grep -n "ERROR" app.log           # show line numbers
grep -c "ERROR" app.log           # count matches (not lines printed)

awk '{print $2}' file.log         # print the 2nd whitespace-separated column
awk -F',' '{print $3}' data.csv   # comma-separated, 3rd column
awk '$3 > 100' metrics.log        # lines where column 3 > 100
awk '{sum += $2} END {print sum}' # sum column 2 across all lines
```

The canonical operator one-liner is the **count-by-key pipeline**:

```bash
grep "ERROR" app.log | awk '{print $3}' | sort | uniq -c | sort -rn
```

Read it left-to-right: find error lines → extract column 3 (say, the error type) → sort so identical values cluster → `uniq -c` counts each group (requires sorted input) → final `sort -rn` puts the most frequent at the top. This pattern answers "what are the top 5 X by frequency" for any X you can extract from text.

---

## Concept 5 — Processes: `ps`, `top`, `kill`

```bash
top                          # interactive process viewer; `q` to quit
ps aux                       # snapshot: USER PID %CPU %MEM ... COMMAND
ps aux | grep myapp          # filter by name (use [m]yapp to exclude the grep itself)
kill 1234                    # send SIGTERM (graceful — process can catch it and clean up)
kill -9 1234                 # send SIGKILL (immediate, uncatchable, NO cleanup)
pkill python                 # kill by name (be careful — matches all `python` processes)
```

**`kill` vs `kill -9` is an interview classic.** `kill` (default `SIGTERM`, signal 15) asks the process to terminate politely — the process can run shutdown handlers (flush buffers, close DB connections, write a final log line). `kill -9` (`SIGKILL`, signal 9) is non-negotiable: the kernel reaps the process *immediately*, the process gets no chance to clean up. Reach for `kill` first; reach for `kill -9` only when the process has ignored `SIGTERM` for several seconds. **Never default to `-9`** — it corrupts in-flight writes, leaves stale lock files, and skips graceful shutdown of child processes.

---

## Concept 6 — Disk and memory: `df`, `du`, `free`

```bash
df -h                        # disk free per filesystem, human-readable
df -i                        # INODE usage (separate from disk bytes!)
du -sh /var/log              # total size of a directory
du -sh /var/log/*            # size per item under the directory

free -h                      # memory in human-readable form
# columns: total used free shared buff/cache available
```

**Inodes can fill independently of disk space.** A filesystem can be 30% full by bytes but 100% full by inodes (millions of tiny files) — writes fail with "no space left on device" while `df -h` shows plenty of room. `df -i` is the second check whenever `df -h` looks fine but writes fail.

**`free -h`'s `available` column** is the answer to "how much memory can I actually use right now" — NOT the `free` column. Linux uses idle memory for disk cache (`buff/cache`), which inflates `used` and deflates `free`, but that cache is reclaimable on demand. `available` accounts for that: it's `free` + the reclaimable part of cache. Reading `free` instead of `available` is the standard junior-vs-senior memory misdiagnosis.

---

## Quick check before you run cards

1. Difference between `tail -f` and `tail -F`?
2. What does `find /var -mtime +7` match — files modified IN the last 7 days, or BEFORE the last 7 days?
3. `cmd > file 2>&1` vs `cmd 2>&1 > file` — which one captures stderr to the file?
4. Walk through `grep ERROR app.log | awk '{print $3}' | sort | uniq -c | sort -rn` stage by stage.
5. When is `kill -9` the right answer? When is it the wrong reflex?
6. In `free -h` output, which column should you read for "memory available for new work" — `free` or `available`? Why?

If any feels shaky — re-read that section, then start the cards.
