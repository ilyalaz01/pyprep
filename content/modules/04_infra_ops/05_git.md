---
module_id: 4
sphere_id: "m4-s5"
title: "Git"
title_ru: "Git"
estimated_minutes: 14
prerequisites: ["m4-s1"]
tags: ["git", "version-control", "branches", "merge", "rebase", "interview-classic"]
---

# Git

Git is universal infrastructure. Every backend / QA / devops / data-engineering interview assumes you can work in branches, resolve a conflict, and explain why `merge` and `rebase` produce different history shapes. A candidate who can't articulate the three-tree model (working directory → staging → local repository) or who freezes on "what does `git fetch` do versus `git pull`" raises immediate flags. The bar isn't deep Git internals (no plumbing commands, no `git filter-branch`); it's whether you've worked on a team using Git for real.

## Why this matters in interviews

The probes are mechanical: "walk through your typical workflow" (edit → `git add` → `git commit` → `git push`); "you have uncommitted changes you want to throw away — what do you run?" (`git restore file`, or `git stash` if you might want them back); "how do you create a branch off main?" (`git switch -c feat`); "merge or rebase — pick one and defend it" (merge for shared history, rebase for local cleanup; never rebase what others have based work on). The marquee question is the merge-vs-rebase one — the candidate who reaches for *both* tools with explicit criteria for each signals "I've collaborated on a real codebase"; the one who claims one is universally better signals "I've followed a single team's convention without understanding why."

---

## Concept 1 — The three-tree model + remote workflow

```
[ working directory ]  ──(git add)─▶  [ staging area / index ]  ──(git commit)─▶  [ local repo ]
                                                                                      │
                                                                                 (git push)
                                                                                      ▼
                                                                                [ remote repo ]
```

Git tracks files across **three local stages** plus the remote:

- **Working directory** — the files you actually edit. `git status` shows them as "modified".
- **Staging area** (a.k.a. the **index**) — a snapshot of what your *next commit* will contain. `git add file` moves changes from working → staging.
- **Local repository** — the committed history on your machine. `git commit -m "msg"` snapshots the staging area into a permanent commit.
- **Remote repository** — the shared central copy (GitHub, GitLab, etc.). `git push` uploads new local commits; `git fetch` downloads new remote commits.

**`git pull` is `git fetch` + `git merge`** in one command. This is the interview-relevant disambiguation: `fetch` only downloads — your working dir and branches are unchanged. `pull` downloads AND merges into your current branch, which can produce a merge commit or fail with conflicts. Many teams prefer `git fetch` followed by an explicit `git merge` or `git rebase` so the merging step is intentional.

**`git status` reads all three local trees.** Output sections: "Changes to be committed" (staged), "Changes not staged for commit" (working-dir modifications not yet staged), "Untracked files" (new files Git has never seen). Plus the line "Your branch is ahead of 'origin/main' by 2 commits" (local vs remote comparison).

---

## Concept 2 — `git diff`, `git status`, `git restore` (and undoing changes)

```bash
git status                    # all three trees at a glance
git status -s                 # short form: M = modified, A = added (staged), ?? = untracked

git diff                      # WORKING-DIR vs STAGING (unstaged changes)
git diff --staged             # STAGING vs LAST COMMIT (what your commit will be)
git diff HEAD~1               # WORKING vs the commit before HEAD
git diff main..feat           # commits in feat not in main

git restore file              # discard working-dir changes (modern replacement for `git checkout -- file`)
git restore --staged file     # unstage (modern replacement for `git reset HEAD file`)
git restore --source=HEAD~2 file   # restore a file's contents from 2 commits ago

git stash                     # set working-dir changes aside (also stashes staging by default)
git stash pop                 # re-apply the most recent stash
```

**`git restore` is destructive on the working directory.** `git restore file` throws away your unsaved edits — there is no undo. If you're not certain you want to lose them, `git stash` first (saves the changes in a stash you can `pop` later).

**Modern vs legacy commands:** older Git documentation used `git checkout` for both branch-switching and file-restoring. Modern Git split these: `git switch` for branches, `git restore` for files. Old tutorials may still show `git checkout -- file` (= `git restore file`) and `git reset HEAD file` (= `git restore --staged file`) — same effect, older spelling.

---

## Concept 3 — Branches: `branch`, `checkout -b`, `switch`, `merge`-readiness

```bash
git branch                    # list local branches; current marked with `*`
git branch -a                 # include remote-tracking branches
git branch new_branch         # CREATE (doesn't switch)
git switch new_branch         # SWITCH to existing branch
git switch -c new_branch      # CREATE + SWITCH (modern equivalent of `git checkout -b`)

git branch -d feat            # delete; REFUSES if `feat` has unmerged commits
git branch -D feat            # delete --force; YES even if unmerged (lost work risk)

git push -u origin feat       # push and set upstream so `git push` works without args next time
```

A **branch** in Git is just a movable pointer to a commit. `main` is a pointer; `feat` is another pointer; switching branches moves your working directory + staging area to match whichever commit the new branch points at.

**Detached HEAD** is the state where you've checked out a specific *commit* directly (e.g., `git checkout abc1234`) instead of a branch. `HEAD` points at the commit, not at any branch. Commits you make in this state belong to no branch — they become unreachable when you switch away, and Git will garbage-collect them. **Recovery:** before switching back to a branch, save your work with `git switch -c rescue` (creates a new branch at the current commit). Modern Git prints a hint in this exact shape when you enter detached HEAD.

---

## Concept 4 — `merge` vs `rebase` (and the golden rule)

```
Before:                          merge result:                  rebase result:

main:   A───B───C                main:   A───B───C───────M      main:   A───B───C
                \                                  ╲     ╱                       ╲
feat:            D───E           feat:              D───E       feat:              D'──E'
```

- **`git merge feat`** (on main) — combines the histories. If `main` and `feat` diverged, Git creates a **merge commit** `M` that has *two parents* (`C` and `E`). History is preserved as a tree.
- **`git rebase main`** (on feat) — replays `feat`'s commits on top of `main`. New commits `D'` and `E'` are created with the same content but different parents (and therefore different commit hashes). History becomes **linear**.

**Result-shape consequences:**

- **Merge** preserves *what actually happened* — diverged work is visible in `git log --graph`; the merge commit timestamps when integration occurred. Good for: long-lived feature branches, releases, any history you want to audit.
- **Rebase** rewrites history to look *as if* the work happened linearly. Cleaner `git log`, easier `git bisect`. Good for: cleaning up local commits before sharing, or updating a feature branch on top of the latest `main` so the eventual merge is fast-forward.

**The golden rule of rebase:** **never rebase commits that have already been pushed to a branch others might be using.** Rebase rewrites commit hashes; if a teammate based their work on commit `D` and you rebase it into `D'`, their clone now has divergent history. They'll see an unexpected merge state on `git pull` (or worse, lose work) and the team has to coordinate a `git push --force-with-lease` cleanup. Safe rule: **rebase your own local commits before pushing; merge when integrating across people.**

**Interactive rebase** (`git rebase -i HEAD~5`) opens an editor where you can `squash` commits together, `reword` messages, `drop` commits entirely, or reorder them. Useful before the first push of a feature branch — clean five "WIP" commits into one coherent "Add X feature" commit. Same golden rule applies: only run interactive rebase on commits you haven't shared.

---

## Quick check before you run cards

1. Walk through what `git status` shows for a file that you (a) modified, (b) staged, (c) committed. What changes between each?
2. Difference between `git fetch` and `git pull`?
3. You have uncommitted changes on `main` and want to switch to `feat` without committing. What command saves them so you can come back later?
4. `git restore file` — what state does the file end up in, and is there an undo?
5. You're on branch `feat` and run `git rebase main`. Why might this cause problems if you'd already pushed `feat` to the remote?
6. Detached HEAD — what is it, when does it happen accidentally, and how do you recover?

If any feels shaky — re-read that section, then start the cards.
