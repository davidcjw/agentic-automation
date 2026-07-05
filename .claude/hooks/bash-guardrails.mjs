#!/usr/bin/env node
// PreToolUse:Bash guardrail. Blocks a small set of known-bad commands.
// Exit 2 + stderr = block the tool call and tell Claude why. Fail-open otherwise.
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Pure decision logic — no I/O, no process.exit. Returns { block, reason? }.
// Kept exported so the test suite can exercise it directly.
export function evaluate(cmd) {
  cmd = cmd ?? "";

  // 1. Banned GitHub topics (flagged David's account previously).
  if (/--add-topic/.test(cmd) && /(^|[\s,="'])(bash|privacy|ports)($|[\s,="'])/.test(cmd)) {
    return {
      block: true,
      reason:
        "Blocked: this sets a banned GitHub topic (bash / privacy / ports), which has flagged the account before. Remove that topic and retry.",
    };
  }

  // 2. Staging a real .env file (allow .env.example / .env.sample / .env.template).
  if (/\bgit\s+add\b/.test(cmd) && /(^|[\s"'])\.env\b/.test(cmd) && !/\.env\.(example|sample|template)/.test(cmd)) {
    return {
      block: true,
      reason:
        "Blocked: this stages a .env file, which risks committing secrets. Add it to .gitignore, or stage .env.example instead.",
    };
  }

  // 3. Pushing straight to main/master (be conservative — only explicit forms).
  if (/\bgit\s+push\b/.test(cmd) && /\borigin\s+(main|master)\b/.test(cmd)) {
    return {
      block: true,
      reason:
        "Blocked: direct push to main/master. Branch and open a PR (or confirm explicitly if this is intentional).",
    };
  }

  // 4. Destructive ops on LIVE persistent state (a running service's data), not
  //    test scratch. Cause of a real board-data loss: `rm -rf .data` deleted the
  //    Agent Task Board's live board.json (repo .data/ doubled as prod storage).
  //    Blocks rm / git clean -x / truncation that names `.data`, `board.json`, or
  //    the board's Application Support dir — UNLESS the path is clearly temp.
  const hitsLiveData =
    /(^|[\s"'~./=])\.data(\/|\b|["'\s]|$)/.test(cmd) ||
    /\bboard\.json\b/.test(cmd) ||
    /Application Support\/agent-task-board/.test(cmd);
  const isTempPath =
    /(\/tmp\/|\/private\/tmp\/|\/var\/folders\/|\$TMPDIR|\bTMPDIR=|atb-worktrees|mkdtemp|scratchpad|atb-[a-z0-9]+-[a-z0-9]{4,})/i.test(cmd);
  const isDestructive =
    /\brm\s+(-\S*\s+)*\S/.test(cmd) ||
    /\bgit\s+clean\b[^|]*\s-\S*[xX]/.test(cmd) ||
    />\s*\S*board\.json\b/.test(cmd);
  if (hitsLiveData && isDestructive && !isTempPath) {
    return {
      block: true,
      reason:
        "Blocked: this deletes/overwrites live Agent Task Board state (.data / board.json / its Application Support dir) — the running control plane's persistent board, NOT test scratch. If you meant a throwaway board, point BOARD_DATA_DIR at a $TMPDIR path and delete that exact path instead. To touch the real one, back it up and run it yourself.",
    };
  }

  // 4b. `git clean -x/-X` removes gitignored files too — that includes a repo's
  //     live `.data/` board without ever naming it. Block outside temp dirs.
  if (/\bgit\s+clean\b/.test(cmd) && /\s-\S*[xX]/.test(cmd) && !isTempPath) {
    return {
      block: true,
      reason:
        "Blocked: `git clean -x/-X` removes gitignored files, which includes a project's live `.data/` (e.g. the Agent Task Board's board.json). Run `git clean -n` to preview, then run it yourself if you're sure.",
    };
  }

  return { block: false };
}

// CLI section: read the hook payload from fd 0 and block by exiting 2.
// Only runs when this file is executed directly, not when imported by tests.
// realpath both sides so it still fires when the hook is invoked via a symlink.
function isDirectRun() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  try {
    const input = JSON.parse(readFileSync(0, "utf8"));
    const { block, reason } = evaluate(input?.tool_input?.command ?? "");
    if (block) {
      process.stderr.write(reason + "\n");
      process.exit(2);
    }
  } catch {
    // Never let a hook error break the session.
    process.exit(0);
  }
  process.exit(0);
}
