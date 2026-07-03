#!/usr/bin/env node
// Stop hook (opt-in per repo): run ruff + pytest when Python code changed, block
// turn-end on failure. Python sibling of test-gate.mjs. Wire in via a repo's
// .claude/settings.local.json. Prefers the repo's .venv binaries; skips a tool
// if it isn't installed. Fail-open; one enforced retry then yields.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync, execSync } from "node:child_process";

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
// Resolve a tool from the nearest .venv/bin.
function resolveVenv(root, name) {
  let dir = root;
  for (let i = 0; i < 15; i++) {
    const c = join(dir, ".venv", "bin", name);
    if (existsSync(c)) return c;
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
    process.exit(0);
  }
  const changedPy = gitStatus.split("\n").some((l) => /\.py$/.test(l.slice(3).trim()));
  if (!changedPy) process.exit(0);

  const root =
    findUp(cwd, "pyproject.toml") || findUp(cwd, "setup.py") ||
    findUp(cwd, "requirements.txt") || (existsSync(join(cwd, "tests")) ? cwd : null);
  if (!root) process.exit(0);

  const failures = [];
  const run = (label, bin, args) => {
    if (!bin) return;
    try {
      execFileSync(bin, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      const out = ((e.stdout?.toString() || "") + (e.stderr?.toString() || "")).trim();
      failures.push(`### ${label} failed\n${out.slice(-3000)}`);
    }
  };

  // Both resolved from the repo's own .venv only — never a global tool, so a repo
  // that never adopted ruff/pytest is never gated by one.
  const ruff = resolveVenv(root, "ruff");
  if (ruff) run("ruff", ruff, ["check", "."]);

  const pytest = resolveVenv(root, "pytest");
  if (pytest) run("pytest", pytest, ["-q"]);

  if (failures.length === 0) process.exit(0);
  const msg = "Python quality gate failed before finishing. Fix these, then stop again:\n\n" + failures.join("\n\n");
  if (alreadyBlocked) {
    process.stderr.write("[py-gate] Still failing after a retry — letting the turn end:\n" + msg + "\n");
    process.exit(0);
  }
  process.stderr.write(msg + "\n");
  process.exit(2);
} catch {
  process.exit(0);
}
