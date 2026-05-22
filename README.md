# Agentic Automation

My personal setup to how I manage AI agents.

The skills in this project are intended to be used with the following MCP servers.

## Enabling auto mode

So here's what I found (I'm on Pro plan btw): auto-mode is not enabled by default. As in you can't even see it on the desktop app and on the cli. But after I ran the following command in the cli, i could cycle through (Shift-Tab) the modes and see auto-mode. I then restarted by desktop app and I could now see it on my desktop app. How bizaare?!

```bash
claude --permission-mode auto
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

1. `./claude/CLAUDE.md`: User (global) specific instructions. Place it in `~/.claude`
2. `./claude/skills`: User (global) level skills. Place it in `~/.claude`
