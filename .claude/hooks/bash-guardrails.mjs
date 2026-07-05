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
