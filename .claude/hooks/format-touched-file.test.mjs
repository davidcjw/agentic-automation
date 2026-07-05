import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  chmodSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// PostToolUse:Edit|Write hook. It shells out to the repo's LOCAL prettier bin
// (node_modules/.bin/prettier). We never invoke real prettier — we drop a node
// shim at that path that appends a marker, so "did it format?" is observable.
const hook = join(dirname(fileURLToPath(import.meta.url)), "format-touched-file.mjs");

const PRETTIER_SHIM = `#!/usr/bin/env node
const fs = require("fs");
const f = process.argv[process.argv.length - 1];
fs.appendFileSync(f, "\\nformatted-by-prettier\\n");
`;

function withDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "format-touched-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Drop a fake local prettier that appends a marker to whatever file it's given.
function installPrettier(dir) {
  const bin = join(dir, "node_modules", ".bin");
  mkdirSync(bin, { recursive: true });
  const p = join(bin, "prettier");
  writeFileSync(p, PRETTIER_SHIM);
  chmodSync(p, 0o755);
}

function runHook(dir, filePath) {
  return spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ tool_input: { file_path: filePath } }),
    cwd: dir,
    encoding: "utf8",
  });
}

test("formats a supported file when a local prettier is resolvable", () =>
  withDir((dir) => {
    installPrettier(dir);
    const file = join(dir, "code.js");
    writeFileSync(file, "const a=1;");
    const r = runHook(dir, file);
    assert.equal(r.status, 0);
    assert.match(readFileSync(file, "utf8"), /formatted-by-prettier/);
  }));

test("ignores files with an unsupported extension (no formatting)", () =>
  withDir((dir) => {
    installPrettier(dir);
    const file = join(dir, "notes.txt");
    writeFileSync(file, "const a=1;");
    const r = runHook(dir, file);
    assert.equal(r.status, 0);
    assert.doesNotMatch(readFileSync(file, "utf8"), /formatted-by-prettier/);
  }));

test("no local prettier -> exits 0 and leaves the file untouched", () =>
  withDir((dir) => {
    // Note: no installPrettier() here.
    const file = join(dir, "code.ts");
    writeFileSync(file, "const a=1;");
    const r = runHook(dir, file);
    assert.equal(r.status, 0);
    assert.equal(readFileSync(file, "utf8"), "const a=1;");
  }));

test("missing / nonexistent file_path -> exits 0, does nothing", () =>
  withDir((dir) => {
    installPrettier(dir);
    assert.equal(runHook(dir, undefined).status, 0);
    assert.equal(runHook(dir, join(dir, "ghost.js")).status, 0);
  }));
