---
name: prune-stale-branches
description: Scans the immediate subdirectories of a given directory for git repos and deletes local branches that are stale — already merged into the remote's default branch, or whose upstream tracking branch was deleted (e.g. after a squash-merge on GitHub). Use when the user wants to clean up old/merged local git branches across multiple repos, e.g. "prune stale branches", "clean up merged branches in ~/code", "delete branches that are already merged".
---

# Prune Stale Branches

## Quick start

```bash
# dry run (default) — shows what would be deleted, deletes nothing
scripts/prune-stale-branches.sh ~/code

# actually delete the stale branches
scripts/prune-stale-branches.sh ~/code --delete
```

Only scans **immediate subdirectories** of the given directory (not nested/recursive) — each one that contains a `.git` folder is treated as a repo.

## What counts as stale

A local branch is stale if either is true:
- its tip is an ancestor of `origin/<default-branch>` (fully merged), or
- its upstream shows `[gone]` in `git branch -vv` (remote branch was deleted — the common case for squash-merged GitHub PRs, where the branch isn't a literal git ancestor of the default branch)

## Safety behavior

- **Dry-run by default.** Nothing is deleted unless `--delete` is passed.
- Never touches the currently checked-out branch in any repo.
- Never touches the repo's default branch (detected via `origin/HEAD`, falling back to `main`/`master`).
- Skips a repo entirely if it has uncommitted changes (`git status --porcelain` is non-empty).
- Skips a repo if it has no `origin` remote, or if `git fetch --prune` fails (e.g. offline).
- Ancestry-merged branches are deleted with safe `git branch -d`. Gone-upstream branches are deleted with `git branch -D` (git refuses `-d` on squash-merges since there's no direct ancestry) — these are labeled `[gone-upstream]` in the output specifically so you can review them before running with `--delete`.

## Workflow

1. Run without `--delete` first and read the per-repo report.
2. Confirm the `[gone-upstream]` entries look right (these are force-deleted).
3. Re-run with `--delete` to apply.

## Reference

Run the script with `-h` for usage, or read [scripts/prune-stale-branches.sh](scripts/prune-stale-branches.sh) directly — it's the single source of truth for the deletion logic.
