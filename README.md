# Agentic Automation

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Claude Code](https://img.shields.io/badge/Claude%20Code-config-orange)

My personal setup to how I manage AI agents.

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

## Contributing

This is a personal setup, but suggestions are welcome — open an issue to share an idea or a fix.

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
By participating you agree to uphold a welcoming, harassment-free environment.

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
