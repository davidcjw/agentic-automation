#!/usr/bin/env node
// PreToolUse:Bash guardrail. Blocks a small set of known-bad commands.
// Exit 2 + stderr = block the tool call and tell Claude why. Fail-open otherwise.
import { readFileSync } from "node:fs";

function block(reason) {
  process.stderr.write(reason + "\n");
  process.exit(2);
}

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const cmd = input?.tool_input?.command ?? "";

  // 1. Banned GitHub topics (flagged David's account previously).
  if (/--add-topic/.test(cmd) && /(^|[\s,="'])(bash|privacy|ports)($|[\s,="'])/.test(cmd)) {
    block(
      "Blocked: this sets a banned GitHub topic (bash / privacy / ports), which has flagged the account before. Remove that topic and retry."
    );
  }

  // 2. Staging a real .env file (allow .env.example / .env.sample / .env.template).
  if (/\bgit\s+add\b/.test(cmd) && /(^|[\s"'])\.env\b/.test(cmd) && !/\.env\.(example|sample|template)/.test(cmd)) {
    block(
      "Blocked: this stages a .env file, which risks committing secrets. Add it to .gitignore, or stage .env.example instead."
    );
  }

  // 3. Pushing straight to main/master (be conservative — only explicit forms).
  if (/\bgit\s+push\b/.test(cmd) && /\borigin\s+(main|master)\b/.test(cmd)) {
    block(
      "Blocked: direct push to main/master. Branch and open a PR (or confirm explicitly if this is intentional)."
    );
  }
} catch {
  // Never let a hook error break the session.
  process.exit(0);
}
process.exit(0);
