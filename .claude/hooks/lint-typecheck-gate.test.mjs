import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Stop hook: when code changed, run the repo's `lint` + `typecheck` npm scripts;
// block (exit 2) if either fails. Stubs `git` (change detection) and `npm` (the
// script runner) via node shims on PATH. The npm shim fails only when its args
// contain $NPM_FAIL_ON, so we can assert exactly which script gated.
const hook = join(dirname(fileURLToPath(import.meta.url)), "lint-typecheck-gate.mjs");

const GIT_SHIM = `#!/usr/bin/env node
if (process.argv[2] === "status") {
  if (process.env.GIT_FAIL === "1") process.exit(128);
  process.stdout.write((process.env.GIT_STATUS || "") + "\\n");
}
process.exit(0);
`;
const NPM_SHIM = `#!/usr/bin/env node
const args = process.argv.slice(2);
const fail = process.env.NPM_FAIL_ON;
if (fail && args.includes(fail)) { console.log(fail + " reported an error"); process.exit(1); }
process.exit(0);
`;

function shim(binDir, name, body) {
  mkdirSync(binDir, { recursive: true });
  const p = join(binDir, name);
  writeFileSync(p, body);
  chmodSync(p, 0o755);
}

function withRepo(pkg, fn) {
  const dir = mkdtempSync(join(tmpdir(), "lint-gate-"));
  try {
    writeFileSync(join(dir, "package.json"), JSON.stringify(pkg));
    const bin = join(dir, "bin");
    shim(bin, "git", GIT_SHIM);
    shim(bin, "npm", NPM_SHIM);
    return fn(dir, bin);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runHook(dir, bin, { input = {}, env = {} } = {}) {
  return spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ cwd: dir, ...input }),
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, PATH: bin + ":" + process.env.PATH, ...env },
  });
}

const BOTH = { scripts: { lint: "eslint .", typecheck: "tsc --noEmit" } };

test("not a git repo -> exits 0", () =>
  withRepo(BOTH, (dir, bin) => {
    assert.equal(runHook(dir, bin, { env: { GIT_FAIL: "1", NPM_FAIL_ON: "lint" } }).status, 0);
  }));

test("no code files changed -> exits 0", () =>
  withRepo(BOTH, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M README.md", NPM_FAIL_ON: "lint" } });
    assert.equal(r.status, 0);
  }));

test("code changed but no lint/typecheck scripts (no tsconfig) -> exits 0", () =>
  withRepo({ scripts: {} }, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M src/app.ts" } });
    assert.equal(r.status, 0);
  }));

test("code changed + lint & typecheck pass -> exits 0", () =>
  withRepo(BOTH, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M src/app.ts" } });
    assert.equal(r.status, 0);
  }));

test("code changed + typecheck fails -> blocks (exit 2); only the failing script is reported", () =>
  withRepo(BOTH, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M src/app.ts", NPM_FAIL_ON: "typecheck" } });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Quality gate failed/);
    assert.match(r.stderr, /### typecheck failed/);
    assert.doesNotMatch(r.stderr, /### lint failed/); // lint passed, so it isn't listed
  }));

test("already-blocked retry still failing -> downgrades to exit 0", () =>
  withRepo(BOTH, (dir, bin) => {
    const r = runHook(dir, bin, {
      input: { stop_hook_active: true },
      env: { GIT_STATUS: " M src/app.ts", NPM_FAIL_ON: "lint" },
    });
    assert.equal(r.status, 0);
    assert.match(r.stderr, /Still failing after a retry/);
  }));
