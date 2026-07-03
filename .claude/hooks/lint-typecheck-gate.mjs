#!/usr/bin/env node
// Stop hook: quality gate. When code changed in this repo, run the repo's
// lint + typecheck scripts. If either fails, block the stop (exit 2) and hand
// Claude the errors so it fixes them before the turn ends.
//
// Design choices:
//  - Only fires when `git status` shows changed code files -> silent on chat turns.
//  - Runs lint + typecheck only (fast, deterministic). Not tests (slow/flaky).
//  - Fail-open on any hook error.
//  - If it already blocked once (stop_hook_active) and still fails, it downgrades
//    to a non-blocking warning so a genuinely-unfixable lint can't loop forever.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync, execSync } from "node:child_process";

const CODE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|css|scss)$/;

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
  const cwd = input?.cwd || process.cwd();
  const alreadyBlocked = input?.stop_hook_active === true;

  // Must be a git repo.
  let gitStatus;
  try {
    gitStatus = execSync("git status --porcelain", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    process.exit(0); // not a git repo
  }
  // Only gate when code files actually changed.
  const changedCode = gitStatus.split("\n").some((l) => CODE_RE.test(l.slice(3).trim()));
  if (!changedCode) process.exit(0);

  const pkgDir = findUp(cwd, "package.json");
  if (!pkgDir) process.exit(0);
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  const scripts = pkg.scripts || {};

  const toRun = [];
  if (scripts.lint) toRun.push(["lint", ["run", "lint"]]);
  if (scripts.typecheck) toRun.push(["typecheck", ["run", "typecheck"]]);
  else if (existsSync(join(pkgDir, "tsconfig.json")) && existsSync(join(pkgDir, "node_modules", ".bin", "tsc"))) {
    toRun.push(["typecheck", ["exec", "--", "tsc", "--noEmit"]]);
  }
  if (toRun.length === 0) process.exit(0);

  const failures = [];
  for (const [name, args] of toRun) {
    try {
      execFileSync("npm", args, { cwd: pkgDir, stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      const out = ((e.stdout?.toString() || "") + (e.stderr?.toString() || "")).trim();
      failures.push(`### ${name} failed\n${out.slice(-3000)}`);
    }
  }

  if (failures.length === 0) process.exit(0);

  const msg =
    "Quality gate failed before finishing. Fix these, then stop again:\n\n" +
    failures.join("\n\n");

  if (alreadyBlocked) {
    // Already gave Claude one enforced retry; don't loop forever on an unfixable error.
    process.stderr.write("[gate] Still failing after a retry — letting the turn end. Please review:\n" + msg + "\n");
    process.exit(0);
  }
  process.stderr.write(msg + "\n");
  process.exit(2);
} catch {
  process.exit(0);
}
