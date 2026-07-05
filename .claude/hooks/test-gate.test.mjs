import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Stop hook: when code changed in the repo, run `npm test`; block turn-end
// (exit 2) on failure. We stub the two boundaries it shells out to — `git`
// (status detection) and `npm` (the test run) — with node shims on PATH, so no
// real git repo or test suite is touched.
const hook = join(dirname(fileURLToPath(import.meta.url)), "test-gate.mjs");

// `git status ...` -> prints $GIT_STATUS, or exits non-zero (not-a-repo) on $GIT_FAIL.
const GIT_SHIM = `#!/usr/bin/env node
if (process.argv[2] === "status") {
  if (process.env.GIT_FAIL === "1") process.exit(128);
  process.stdout.write((process.env.GIT_STATUS || "") + "\\n");
}
process.exit(0);
`;
// `npm test` -> exit 1 with output on $NPM_FAIL, else exit 0.
const NPM_SHIM = `#!/usr/bin/env node
if (process.env.NPM_FAIL === "1") { console.log("1 failing test"); process.exit(1); }
process.exit(0);
`;

function shim(binDir, name, body) {
  mkdirSync(binDir, { recursive: true });
  const p = join(binDir, name);
  writeFileSync(p, body);
  chmodSync(p, 0o755);
}

function withRepo({ pkg = { scripts: { test: "node --test" } } } = {}, fn) {
  const dir = mkdtempSync(join(tmpdir(), "test-gate-"));
  try {
    if (pkg) writeFileSync(join(dir, "package.json"), JSON.stringify(pkg));
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

test("not a git repo -> exits 0", () =>
  withRepo({}, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_FAIL: "1", NPM_FAIL: "1" } });
    assert.equal(r.status, 0);
  }));

test("no code files changed -> exits 0 without running tests", () =>
  withRepo({}, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M README.md", NPM_FAIL: "1" } });
    assert.equal(r.status, 0);
  }));

test("code changed but no test script -> exits 0", () =>
  withRepo({ pkg: { scripts: {} } }, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M src/app.ts", NPM_FAIL: "1" } });
    assert.equal(r.status, 0);
  }));

test("code changed + tests pass -> exits 0", () =>
  withRepo({}, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M src/app.ts" } });
    assert.equal(r.status, 0);
  }));

test("code changed + tests fail -> blocks (exit 2) with the failure", () =>
  withRepo({}, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M src/app.ts", NPM_FAIL: "1" } });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Tests failed before finishing/);
    assert.match(r.stderr, /1 failing test/);
  }));

test("already-blocked retry still failing -> downgrades to exit 0 (no infinite loop)", () =>
  withRepo({}, (dir, bin) => {
    const r = runHook(dir, bin, {
      input: { stop_hook_active: true },
      env: { GIT_STATUS: " M src/app.ts", NPM_FAIL: "1" },
    });
    assert.equal(r.status, 0);
    assert.match(r.stderr, /Still failing after a retry/);
  }));
