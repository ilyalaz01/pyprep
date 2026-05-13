---
module_id: 4
sphere_id: "m4-s1"
title: "Linux CLI Basics"
title_ru: "Основы Linux CLI"
estimated_minutes: 12
prerequisites: ["m4-s0"]
tags: ["linux", "cli", "shell", "permissions", "interview-classic"]
---

# Linux CLI Basics

"Can you navigate a Linux server via SSH?" is a binary screen at every Israeli backend / automation / QA interview. Senior engineers SSH to a production box mid-conversation to diagnose an issue; the candidate is expected to follow without freezing. Not shell-wizardry — just whether you can `cd`, list files, copy / move / delete, and read permissions without `man`.

## Why this matters in interviews

The interviewer is checking *operational reflex*. A candidate who types `cd ~/projects && ls -la` without thinking, knows `rm -rf` is irreversible, and reads `-rw-r--r--` at a glance has used a terminal. One who pastes paths from Google or hesitates on `chmod 755` hasn't. Five minutes reveals it.

---

## Concept 1 — `pwd`, `cd`, `ls -la`

```bash
pwd                          # print working directory: /home/alice/projects
cd /var/log                  # absolute
cd ../..                     # up two levels
cd ~                         # home directory (also: just `cd`)
cd -                         # back to the PREVIOUS directory ($OLDPWD)

ls                           # list files (no hidden, brief)
ls -l                        # long format: perms, links, owner, group, size, date, name
ls -a                        # include hidden (dot-files)
ls -la                       # combine: long + hidden
ls -lh                       # human-readable sizes (1.4K instead of 1432)
```

`ls -l` columns: `type+perms links owner group size date name`. First char is **type** (`-` file, `d` directory, `l` symlink); next nine are perms in `rwxrwxrwx` form (`u/g/o`, see Concept 4).

`cd -` is the lesser-known one worth memorizing: jumps to the previous directory, useful for ping-ponging between two locations.

---

## Concept 2 — `touch`, `mkdir`, `rm -rf` (and dangers)

```bash
touch file.txt               # create empty file (or refresh mtime if it exists)
mkdir new_dir                # create one directory
mkdir -p a/b/c/d             # create nested, no error if intermediates exist
rm file.txt                  # delete (no Trash on Linux CLI; no recovery)
rm -r dir/                   # recursive (directories)
rm -rf dir/                  # recursive + force: no prompt, no error if missing
```

**Incident-report danger:**

```bash
rm -rf $UNSET_VAR/important   # if $UNSET_VAR is empty:
rm -rf /important              # ...root-anchored, wipes the path
```

Modern GNU coreutils ships `--preserve-root` by default — refuses `rm -rf /` outright. But `rm -rf $UNSET_VAR/some/path` becoming `rm -rf /some/path` is NOT caught and still wipes the target.

**Defenses:** `set -u` in bash scripts (unset variable → error before the call); always quote `"$VAR"`; validate paths before passing to `rm -rf`.

---

## Concept 3 — `cp`, `mv`

```bash
cp source dest               # copy a file
cp -r source_dir dest_dir    # recursive (directories require -r)
cp -p source dest            # preserve mode, ownership, timestamps
mv old.txt new.txt           # rename (same dir, same filesystem)
mv file.txt /other/path/     # move (different dir, possibly different fs)
```

`mv` on the same filesystem is **atomic** — the kernel renames the inode, no data is moved. Cross-filesystem becomes copy-then-delete (non-atomic; a crash mid-move leaves partial state).

`cp` follows symlinks by default — `cp link_to_dir/ dest/` copies the *target*, not the link. `cp -d` / `-P` copies the link itself. `cp -a` (archive) is the safe-default omnibus: preserves metadata, doesn't follow symlinks, recurses.

---

## Concept 4 — Permissions: `r/w/x` × `u/g/o`

The 9-bit permission model: three groups (**u**ser/owner, **g**roup, **o**ther) × three flags (**r**ead, **w**rite, e**x**ecute). `-rwxr-xr--` reads as: file (`-`), owner `rwx`, group `r-x`, other `r--`.

`chmod` sets perms. Two forms:

- **Numeric** (octal): `chmod 755 file` — `7=rwx`, `5=r-x`, `4=r--`. So 755 = `rwxr-xr-x`. Common: **755** (scripts, dirs), **644** (regular files), **600** (private — SSH keys), **700** (private dir).
- **Symbolic**: `chmod u+x file` (add exec for owner), `chmod o-r file` (remove read for other), `chmod a+w file` (write for all).

`chown user:group file` changes ownership; `sudo` runs as root. **Anti-pattern:** `chmod 777` almost never makes sense in production; it's a "I gave up debugging the real perm issue" smell.

---

## Quick check before you run cards

1. What does `cd -` do?
2. Why is `rm -rf $UNSET_VAR/path` dangerous *even with* `--preserve-root`?
3. Difference between `mv` same-filesystem and cross-filesystem?
4. What does `chmod 644` translate to in `rwx` form?
5. When is `chmod 777` ever the right answer? (Hint: almost never.)

If any feels shaky — re-read that section, then start the cards.
