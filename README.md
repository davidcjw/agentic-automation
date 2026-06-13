# Agentic Automation

My personal setup to how I manage AI agents.

## Enabling auto mode

So here's what I found (I'm on Pro plan btw): auto-mode is not enabled by default. As in you can't even see it on the desktop app and on the cli. But after I ran the following command in the cli, i could cycle through (Shift-Tab) the modes and see auto-mode. I then restarted by desktop app and I could now see it on my desktop app. How bizaare?!

```bash
claude --permission-mode auto
```

Set alias in `~/.zshrc`:

```bash
alias claude='claude --permission-mode auto'
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

1. `./claude/CLAUDE.md`: User (global) specific instructions. Symlink it via:

    ```bash
    ln -s ~/path/to/.claude/CLAUDE.md ~/.claude/CLAUDE.md
    ```

2. `./claude/skills`: User (global) level skills. Place it in `~/.claude`

    ```bash
    ln -s ~/path/to/.claude/skills ~/.claude/skills
    ```

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
