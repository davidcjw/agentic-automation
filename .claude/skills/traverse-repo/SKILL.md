---
name: traverse-repo
description: Deeply explores a repository's structure, identifies entrypoints, key interfaces, and main functions, then writes a CODEBASE.md file at the repo root as a persistent agent-readable map. Use when the user wants to understand a new codebase, onboard to a repo, generate a codebase index, or when asked to "map", "index", "traverse", or "explore" a repository.
---

# traverse-repo

Creates `CODEBASE.md` at the repo root — a gitignored map that future agent sessions load to orient themselves without re-exploring the codebase from scratch. Do NOT update .gitignore in the repo itself - user should update their own global gitignore.

If already exists, look through this file and identify what are the incremental changes and update `CODEBASE.md` accordingly.

## Exploration workflow

### 1. File tree
```bash
find . -type f | grep -v -E "\.git|node_modules|vendor|dist|\.cache|\.venv|venv/|\.env/|__pycache__|\.tox|\.mypy_cache|\.pytest_cache|\.ruff_cache|\.eggs|\.egg-info|build/|target/" | sort
```
Identify top-level directories and their roles.

### 2. Project metadata
Read whichever are present: `README.md`, `go.mod`, `go.sum`, `package.json`, `pyproject.toml`, `Cargo.toml`, `Chart.yaml`, `Makefile`

### 3. Entrypoints
Look for: `main.go`, `cmd/*/main.go`, `main.py`, `index.ts`, `src/main.*`, `app.py`, `server.*`, `hack/` scripts

### 4. Key interfaces & types
- **Go**: `grep -rn "^type.*interface" --include="*.go"`
- **TypeScript**: `grep -rn "^export interface\|^export type" --include="*.ts"`
- **Python**: `grep -rn "^class " --include="*.py"`

### 5. Key functions
Look for exported functions/methods that represent primary operations — not helpers. Note file path + line number.

---

## CODEBASE.md structure

Write the file with these sections:

```markdown
# Codebase Map
_Last updated: <date>_

## What this repo does
[1-2 sentences]

## Directory layout
[Annotated top-level tree — one line per dir]

## Entrypoints
| File | Purpose |
|------|---------|
| path/to/main.go | ... |

## Key interfaces & types
| Symbol | File:Line | Description |
|--------|-----------|-------------|

## Key functions
| Symbol | File:Line | Description |
|--------|-----------|-------------|

## External dependencies
[What the major deps are and why they exist]

## Where to find things
| To change... | Look in... |
|-------------|-----------|
| API handlers | ... |
| Config schema | ... |
```

## Rules
- One line per entry — this is a map, not docs
- Skip generated files, vendored deps, test fixtures
- Include `File:Line` so agents can jump directly
- Update the "Last updated" date each time the file is regenerated
