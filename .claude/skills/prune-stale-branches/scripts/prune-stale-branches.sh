#!/usr/bin/env bash
# Deletes local git branches that are stale (merged into the remote default
# branch, or whose upstream has been deleted) across all git repos found one
# level below a given directory.
set -uo pipefail

usage() {
  echo "Usage: $0 <directory> [--delete]" >&2
  echo "  <directory>  parent dir; each immediate subdirectory that is a git repo is scanned" >&2
  echo "  --delete     actually delete stale branches (default: dry-run report only)" >&2
  exit 1
}

[ $# -ge 1 ] || usage

BASE_DIR=""
MODE="dry-run"
for arg in "$@"; do
  case "$arg" in
    --delete) MODE="delete" ;;
    -h|--help) usage ;;
    *) BASE_DIR="$arg" ;;
  esac
done

[ -n "$BASE_DIR" ] || usage
[ -d "$BASE_DIR" ] || { echo "Not a directory: $BASE_DIR" >&2; exit 1; }

for repo in "$BASE_DIR"/*/; do
  [ -d "$repo/.git" ] || continue
  repo_name="$(basename "$repo")"
  echo "=== $repo_name ==="

  (
    cd "$repo" || exit 0

    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
      echo "  skipped (uncommitted changes)"
      exit 0
    fi

    if ! git remote get-url origin >/dev/null 2>&1; then
      echo "  skipped (no 'origin' remote)"
      exit 0
    fi

    if ! git fetch --prune --quiet origin 2>/dev/null; then
      echo "  skipped (fetch failed — offline?)"
      exit 0
    fi

    default_branch="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@')"
    if [ -z "$default_branch" ]; then
      git remote set-head origin -a >/dev/null 2>&1 || true
      default_branch="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@')"
    fi
    if [ -z "$default_branch" ]; then
      for cand in main master; do
        if git show-ref --verify --quiet "refs/remotes/origin/$cand"; then
          default_branch="$cand"
          break
        fi
      done
    fi
    if [ -z "$default_branch" ]; then
      echo "  skipped (could not determine default branch)"
      exit 0
    fi

    current_branch="$(git branch --show-current)"
    candidates=()
    reasons=()

    while IFS=$'\t' read -r branch track; do
      [ -n "$branch" ] || continue
      [ "$branch" = "$current_branch" ] && continue
      [ "$branch" = "$default_branch" ] && continue

      reason=""
      if [[ "$track" == *"[gone]"* ]]; then
        reason="gone-upstream"
      elif git merge-base --is-ancestor "$branch" "origin/$default_branch" 2>/dev/null; then
        reason="merged"
      fi

      if [ -n "$reason" ]; then
        candidates+=("$branch")
        reasons+=("$reason")
      fi
    done < <(git for-each-ref refs/heads --format='%(refname:short)%09%(upstream:track)')

    if [ "${#candidates[@]}" -eq 0 ]; then
      echo "  nothing stale"
      exit 0
    fi

    for i in "${!candidates[@]}"; do
      branch="${candidates[$i]}"
      reason="${reasons[$i]}"
      if [ "$MODE" = "delete" ]; then
        if [ "$reason" = "gone-upstream" ]; then
          if git branch -D "$branch" >/dev/null 2>&1; then
            echo "  deleted [$reason] $branch"
          else
            echo "  FAILED to delete [$reason] $branch"
          fi
        else
          if git branch -d "$branch" >/dev/null 2>&1; then
            echo "  deleted [$reason] $branch"
          else
            echo "  FAILED to delete [$reason] $branch (not fully merged?)"
          fi
        fi
      else
        echo "  would delete [$reason] $branch"
      fi
    done
  )
done

if [ "$MODE" = "dry-run" ]; then
  echo
  echo "Dry run only — re-run with --delete to actually remove branches."
fi
