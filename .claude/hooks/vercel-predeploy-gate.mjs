#!/usr/bin/env node
// PreToolUse:Bash — fires ONLY on an explicit production Vercel deploy
// (`vercel ... --prod`). Enforces the deploy rule: a favicon must exist and the
// test suite must pass before shipping to prod. Blocks (exit 2) if not.
// Preview deploys (no --prod) are untouched. Fail-open on any hook error.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

function block(reason) {
  process.stderr.write(reason + "\n");
  process.exit(2);
}
function findUp(startDir, name) {
  let dir = startDir;
  for (let i = 0; i < 15; i++) {
    if (existsSync(join(dir, name))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const cmd = input?.tool_input?.command ?? "";
  const cwd = input?.cwd || process.cwd();

  // Only gate real production deploys.
  if (!/\bvercel\b/.test(cmd) || !/(^|\s)--prod(\s|$)/.test(cmd)) process.exit(0);

  const root = findUp(cwd, "package.json") || cwd;

  // 1. Favicon must exist (App Router or /public conventions).
  const faviconCandidates = [
    "app/favicon.ico", "app/icon.ico", "app/icon.png", "app/icon.svg",
    "src/app/favicon.ico", "src/app/icon.png", "src/app/icon.svg",
    "public/favicon.ico", "public/favicon.svg", "public/favicon.png",
    "pages/favicon.ico",
  ];
  const hasFavicon = faviconCandidates.some((p) => existsSync(join(root, p)));
  if (!hasFavicon) {
    block(
      "Blocked prod deploy: no favicon found (checked app/favicon.ico, public/favicon.*, etc.). " +
      "Your deploy rule requires a favicon — add one, then redeploy."
    );
  }

  // 2. Tests must pass (rule: always test before deployment).
  let pkg = {};
  try { pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")); } catch {}
  if (pkg.scripts?.test) {
    try {
      execFileSync("npm", ["test"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      const out = ((e.stdout?.toString() || "") + (e.stderr?.toString() || "")).trim();
      block("Blocked prod deploy: tests failed. Fix them before shipping:\n\n" + out.slice(-3000));
    }
  }
} catch {
  process.exit(0);
}
process.exit(0);
