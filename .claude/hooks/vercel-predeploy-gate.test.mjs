import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// PreToolUse:Bash hook: fires ONLY on a production Vercel deploy (`vercel ... --prod`).
// Requires a favicon to exist and the test suite to pass; blocks (exit 2) otherwise.
// Only boundary shelled out to is `npm test`, stubbed via a node shim on PATH.
const hook = join(dirname(fileURLToPath(import.meta.url)), "vercel-predeploy-gate.mjs");

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

// opts: { favicon: bool, pkg: package.json object }
function withRepo({ favicon = false, pkg = {} } = {}, fn) {
  const dir = mkdtempSync(join(tmpdir(), "vercel-gate-"));
  try {
    writeFileSync(join(dir, "package.json"), JSON.stringify(pkg));
    if (favicon) {
      mkdirSync(join(dir, "public"), { recursive: true });
      writeFileSync(join(dir, "public", "favicon.ico"), "");
    }
    const bin = join(dir, "bin");
    shim(bin, "npm", NPM_SHIM);
    return fn(dir, bin);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runHook(dir, bin, command, env = {}) {
  return spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ cwd: dir, tool_input: { command } }),
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, PATH: bin + ":" + process.env.PATH, ...env },
  });
}

test("a Vercel preview deploy (no --prod) is not gated -> exits 0", () =>
  withRepo({ favicon: false }, (dir, bin) => {
    // No favicon present, but a preview deploy must pass through untouched.
    assert.equal(runHook(dir, bin, "vercel deploy").status, 0);
  }));

test("a non-Vercel command containing --prod is ignored -> exits 0", () =>
  withRepo({ favicon: false }, (dir, bin) => {
    assert.equal(runHook(dir, bin, "npm run build --prod").status, 0);
  }));

test("prod deploy with no favicon -> blocks (exit 2)", () =>
  withRepo({ favicon: false }, (dir, bin) => {
    const r = runHook(dir, bin, "vercel --prod");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no favicon found/);
  }));

test("prod deploy with favicon and no test script -> allowed (exit 0)", () =>
  withRepo({ favicon: true, pkg: {} }, (dir, bin) => {
    assert.equal(runHook(dir, bin, "vercel deploy --prod").status, 0);
  }));

test("prod deploy with favicon and passing tests -> allowed (exit 0)", () =>
  withRepo({ favicon: true, pkg: { scripts: { test: "node --test" } } }, (dir, bin) => {
    assert.equal(runHook(dir, bin, "vercel deploy --prod").status, 0);
  }));

test("prod deploy with favicon but failing tests -> blocks (exit 2)", () =>
  withRepo({ favicon: true, pkg: { scripts: { test: "node --test" } } }, (dir, bin) => {
    const r = runHook(dir, bin, "vercel deploy --prod", { NPM_FAIL: "1" });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /tests failed/);
    assert.match(r.stderr, /1 failing test/);
  }));
