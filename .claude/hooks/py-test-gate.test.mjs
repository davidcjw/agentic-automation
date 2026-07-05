import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Stop hook: when Python changed, run ruff + pytest from the repo's OWN .venv;
// block (exit 2) on failure. `git` (change detection) is stubbed on PATH; ruff
// and pytest are resolved by absolute path from .venv/bin, so we drop node shims
// there. A repo without those .venv tools is simply never gated.
const hook = join(dirname(fileURLToPath(import.meta.url)), "py-test-gate.mjs");

const GIT_SHIM = `#!/usr/bin/env node
if (process.argv[2] === "status") {
  if (process.env.GIT_FAIL === "1") process.exit(128);
  process.stdout.write((process.env.GIT_STATUS || "") + "\\n");
}
process.exit(0);
`;
// A ruff/pytest stand-in that fails when $TOOL_FAIL matches its own name.
const TOOL_SHIM = (name) => `#!/usr/bin/env node
if (process.env.TOOL_FAIL === "${name}") { console.log("${name} found problems"); process.exit(1); }
process.exit(0);
`;

function shim(dir, name, body) {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, name);
  writeFileSync(p, body);
  chmodSync(p, 0o755);
}

// opts: { project: write pyproject.toml, venv: ["ruff","pytest"] shims to install }
function withRepo({ project = true, venv = ["ruff", "pytest"] } = {}, fn) {
  const dir = mkdtempSync(join(tmpdir(), "py-gate-"));
  try {
    if (project) writeFileSync(join(dir, "pyproject.toml"), "[project]\nname='x'\n");
    const bin = join(dir, "bin");
    shim(bin, "git", GIT_SHIM);
    const venvBin = join(dir, ".venv", "bin");
    for (const t of venv) shim(venvBin, t, TOOL_SHIM(t));
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
    assert.equal(runHook(dir, bin, { env: { GIT_FAIL: "1", TOOL_FAIL: "pytest" } }).status, 0);
  }));

test("only non-Python files changed -> exits 0 without running tools", () =>
  withRepo({}, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M app.ts", TOOL_FAIL: "pytest" } });
    assert.equal(r.status, 0);
  }));

test("Python changed but no project root (no pyproject/setup/requirements/tests) -> exits 0", () =>
  withRepo({ project: false, venv: [] }, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M app.py" } });
    assert.equal(r.status, 0);
  }));

test("Python changed + ruff & pytest pass -> exits 0", () =>
  withRepo({}, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M app.py" } });
    assert.equal(r.status, 0);
  }));

test("Python changed + pytest fails -> blocks (exit 2)", () =>
  withRepo({}, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M app.py", TOOL_FAIL: "pytest" } });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Python quality gate failed/);
    assert.match(r.stderr, /### pytest failed/);
  }));

test("Python changed + ruff fails -> blocks (exit 2)", () =>
  withRepo({}, (dir, bin) => {
    const r = runHook(dir, bin, { env: { GIT_STATUS: " M app.py", TOOL_FAIL: "ruff" } });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /### ruff failed/);
  }));

test("already-blocked retry still failing -> downgrades to exit 0", () =>
  withRepo({}, (dir, bin) => {
    const r = runHook(dir, bin, {
      input: { stop_hook_active: true },
      env: { GIT_STATUS: " M app.py", TOOL_FAIL: "pytest" },
    });
    assert.equal(r.status, 0);
    assert.match(r.stderr, /Still failing after a retry/);
  }));
