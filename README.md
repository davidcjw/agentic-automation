# Agentic Automation

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Claude Code](https://img.shields.io/badge/Claude%20Code-config-orange)
[![CI](https://github.com/davidcjw/agentic-automation/actions/workflows/ci.yml/badge.svg)](https://github.com/davidcjw/agentic-automation/actions/workflows/ci.yml)

My personal setup to how I manage AI agents.

> **CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and pull request — shellcheck on all `*.sh` and `git-hooks/commit-msg`, `node --check` on every `.claude/hooks/*.mjs` plus `sh -n git-hooks/commit-msg`, the hook test suite (`node --test .claude/hooks/*.test.mjs`), and a `JSON.parse` validation of every `*.json`.

### Testing

The hook guardrails have unit tests written with Node's built-in [`node:test`](https://nodejs.org/api/test.html) runner (no dependencies to install). Run them with:

```bash
node --test .claude/hooks/*.test.mjs
```

- `bash-guardrails.test.mjs` exercises the exported `evaluate()` decision logic (banned GitHub topics, staging `.env`, pushing to `main`/`master`).
- `commit-msg.test.mjs` shells out to `git-hooks/commit-msg` against temp fixtures to verify AI-attribution stripping.

## Enabling auto mode and remote-control by default

```bash
claude --permission-mode auto --rc
```

Set alias in `~/.zshrc`:

```bash
alias claude='claude --permission-mode auto --rc'
```

## Status Line

Use the following prompt:

```txt
Clone https://github.com/daniel3303/ClaudeCodeStatusLine to ~/.claude/statusline/ (or %USERPROFILE%\.claude\statusline\ on Windows) and configure it as my status bar by following its INSTALL.md.
```

## MCP Setup

For local MCP servers, they are saved in `~/.claude.json` while external MCP servers are stored in `~/.claude/.mcp.json`.

Most MCP server setups should be stored at the user level i.e. in `~/.claude.json`.

1. GitHub:

```bash
# Create a GitHub Personal Access Token: https://github.com/settings/personal-access-tokens
# Store it in .env as seen in this setup & source it first
claude mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer '"$(grep GITHUB_PAT .env | cut -d '=' -f2)"'"}}' --scope user

```

## Plugins

1. `context7`: Install via `/plugins`
2. `context-mode`: Install via:

    ```bash
    /plugin marketplace add mksglu/context-mode
    /plugin install context-mode@context-mode
    ```

3. `skill-creator`: Install via `/plugins`
4. `playwright`: For browser automation. Installed via `/plugins`.

### Niche Plugins

- `frontend-design`: Good for any frontend development. Install via `/plugins`
- `superpowers`: Super helpful for planning big features but consumes a lot of tokens. Install via `/plugins`.

## Files

Symlink the following so that future updates to this repo is automatically updated.

1. `./claude/CLAUDE.md`: User (global) specific instructions, plus the on-demand reference docs it points to (`SUPABASE.md`, `DESIGN_SYSTEMS.md`) — loaded only when a task is relevant, to keep `CLAUDE.md` lean. Symlink each:

    ```bash
    R=~/path/to/agentic-automation
    for f in CLAUDE.md SUPABASE.md DESIGN_SYSTEMS.md; do
      ln -s "$R/.claude/$f" ~/.claude/"$f"
    done
    ```

2. `./claude/skills`: User (global) level skills. Place it in `~/.claude`

    ```bash
    ln -s ~/path/to/.claude/skills ~/.claude/skills
    ```

3. `./.claude/hooks/*.mjs`, `./.claude/rules/development.md`, `./.claude/templates/ci.yml`: hook scripts, the dev-workflow rule, and the CI template. Symlink each file back (per-file, so plugin-managed files like `context-mode-cache-heal.mjs` stay local):

    ```bash
    R=~/path/to/agentic-automation
    for f in hooks/bash-guardrails.mjs hooks/vercel-predeploy-gate.mjs \
             hooks/format-touched-file.mjs hooks/lint-typecheck-gate.mjs \
             hooks/test-gate.mjs hooks/py-test-gate.mjs \
             rules/development.md templates/ci.yml; do
      mkdir -p ~/.claude/"$(dirname "$f")"
      ln -s "$R/.claude/$f" ~/.claude/"$f"
    done
    ```

## Hooks

Deterministic quality gates and guardrails, wired in `~/.claude/settings.json`. Scripts are zero-dep Node (`.mjs`) and **fail-open** — a broken hook never blocks a session. Reference snippet to merge into a fresh `settings.json`: [`.claude/settings.hooks.json`](.claude/settings.hooks.json).

**Always-on (global):**

| Hook | Event | What it does |
|------|-------|--------------|
| `bash-guardrails.mjs` | PreToolUse:Bash | Blocks banned GitHub topics, `git add .env`, and `git push origin main/master` |
| `vercel-predeploy-gate.mjs` | PreToolUse:Bash | On `vercel … --prod`: blocks the deploy if no favicon exists or `npm test` fails |
| `format-touched-file.mjs` | PostToolUse:Edit\|Write | Runs the repo's local prettier on the file just edited (no-op if none) |
| `lint-typecheck-gate.mjs` | Stop | When code changed in a git repo, runs `npm run lint`/`typecheck`; blocks turn-end on failure |

**Opt-in per repo** — drop a `settings.local.json` (gitignored / personal, not committed) into the repo:

- `test-gate.mjs` — runs `npm test` on turn-end when code changed. Template: [`.claude/templates/settings.local.node.json`](.claude/templates/settings.local.node.json)
- `py-test-gate.mjs` — runs the repo `.venv`'s ruff + pytest. Template: [`.claude/templates/settings.local.python.json`](.claude/templates/settings.local.python.json)

```bash
cp ~/path/to/agentic-automation/.claude/templates/settings.local.node.json <repo>/.claude/settings.local.json
```

Currently gated (recreate these `settings.local.json` files on a new machine):

- Node (`test-gate`): `questlog`, `portcull`, `ctxbudget`, `agentmeter`, `agentwatch`, `nlb-library-mcp`
- Python (`py-test-gate`): `mcp-eval`, `godaddy-mcp`

> `settings.hooks.json` and the `settings.local.*.json` templates are references only — Claude Code does not load them directly. The live global wiring lives in your machine-local `~/.claude/settings.json` (deliberately kept out of this repo so per-machine settings stay independent).

## Git Hooks

`git-hooks/commit-msg` strips AI attribution (`Co-Authored-By: Claude/Anthropic` trailers and `Generated with Claude Code` lines) from every commit message, in every repo. It delegates to a repo-local `commit-msg` hook first if one exists, so project-specific hooks still run.

Enable it globally by pointing git's `core.hooksPath` at a hooks dir and symlinking the hook in (so repo updates sync automatically):

```bash
mkdir -p ~/.config/git/hooks
ln -s ~/path/to/agentic-automation/git-hooks/commit-msg ~/.config/git/hooks/commit-msg
chmod +x ~/path/to/agentic-automation/git-hooks/commit-msg
git config --global core.hooksPath ~/.config/git/hooks
```

> Note: `core.hooksPath` overrides each repo's `.git/hooks`. The delegation above preserves repo-local `commit-msg` hooks, but other hook types (e.g. `pre-commit`) in individual repos won't run unless you also place them in this dir.

## Contributing

This is a personal setup, but suggestions are welcome — open an issue to share an idea or a fix.

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
By participating you agree to uphold a welcoming, harassment-free environment.

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
