#!/usr/bin/env node
// Stop hook (opt-in per repo): run `npm test` when code changed, block turn-end
// on failure. Same shape as lint-typecheck-gate.mjs but for the test suite.
// Wire it into a repo via that repo's .claude/settings.local.json — see docs at
// the bottom. Fail-open on any hook error; one enforced retry then yields.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync, execSync } from "node:child_process";

const CODE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

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

  let gitStatus;
  try {
    gitStatus = execSync("git status --porcelain", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    process.exit(0); // not a git repo
  }
  const changedCode = gitStatus.split("\n").some((l) => CODE_RE.test(l.slice(3).trim()));
  if (!changedCode) process.exit(0);

  const pkgDir = findUp(cwd, "package.json");
  if (!pkgDir) process.exit(0);
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  if (!pkg.scripts?.test) process.exit(0);

  try {
    execFileSync("npm", ["test"], { cwd: pkgDir, stdio: ["ignore", "pipe", "pipe"] });
    process.exit(0);
  } catch (e) {
    const out = ((e.stdout?.toString() || "") + (e.stderr?.toString() || "")).trim();
    const msg = "Tests failed before finishing. Fix them, then stop again:\n\n" + out.slice(-4000);
    if (alreadyBlocked) {
      process.stderr.write("[test-gate] Still failing after a retry — letting the turn end:\n" + msg + "\n");
      process.exit(0);
    }
    process.stderr.write(msg + "\n");
    process.exit(2);
  }
} catch {
  process.exit(0);
}
