import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// The hook lives two levels up from this test file: .claude/hooks/../../git-hooks/commit-msg
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const hook = join("git-hooks", "commit-msg");

// Run git-hooks/commit-msg against a fixture message, return the rewritten text.
function runHook(message) {
  const dir = mkdtempSync(join(tmpdir(), "commit-msg-test-"));
  const file = join(dir, "COMMIT_EDITMSG");
  try {
    writeFileSync(file, message);
    execFileSync("sh", [hook, file], { cwd: repoRoot });
    return readFileSync(file, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("strips Co-Authored-By: Claude / Anthropic trailers", () => {
  const out = runHook(
    "Fix the thing\n\nBody line.\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nCo-Authored-By: Anthropic <noreply@anthropic.com>\n"
  );
  assert.doesNotMatch(out, /Co-Authored-By:/);
  assert.match(out, /Fix the thing/);
  assert.match(out, /Body line\./);
});

test("removes 'Generated with [Claude Code]' lines", () => {
  const out = runHook(
    "Add feature\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n"
  );
  assert.doesNotMatch(out, /Generated with \[Claude Code\]/);
  assert.doesNotMatch(out, /🤖 Generated with/);
  assert.match(out, /Add feature/);
});

test("removes bare '🤖 Generated with' line", () => {
  const out = runHook("Tidy up\n\n🤖 Generated with something\n");
  assert.doesNotMatch(out, /🤖 Generated with/);
  assert.match(out, /Tidy up/);
});

test("collapses trailing blank lines left after stripping", () => {
  const out = runHook(
    "Refactor module\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n\n\n"
  );
  // No trailing blank lines should remain.
  assert.doesNotMatch(out, /\n\s*\n\s*$/);
  assert.match(out, /Refactor module/);
});

test("leaves a normal message body untouched", () => {
  const message =
    "Implement parser\n\nHandles nested quotes and escapes.\n\n- bullet one\n- bullet two\n";
  const out = runHook(message);
  assert.equal(out, message);
});
