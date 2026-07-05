import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "./bash-guardrails.mjs";

test("banned GitHub topics are blocked", () => {
  for (const topic of ["bash", "privacy", "ports"]) {
    const { block, reason } = evaluate(`gh repo edit --add-topic ${topic}`);
    assert.equal(block, true);
    assert.match(reason, /banned GitHub topic/);
  }
});

test("a normal topic is allowed", () => {
  assert.equal(evaluate("gh repo edit --add-topic automation").block, false);
});

test("staging a real .env is blocked", () => {
  assert.equal(evaluate("git add .env").block, true);
});

test("staging .env.example / .sample / .template is allowed", () => {
  assert.equal(evaluate("git add .env.example").block, false);
  assert.equal(evaluate("git add .env.sample").block, false);
  assert.equal(evaluate("git add .env.template").block, false);
});

test("git push to main/master is blocked", () => {
  assert.equal(evaluate("git push origin main").block, true);
  assert.equal(evaluate("git push origin master").block, true);
});

test("git push to a feature branch is allowed", () => {
  assert.equal(evaluate("git push origin feature").block, false);
});

test("deleting live board state (.data / board.json) is blocked", () => {
  assert.equal(evaluate("rm -rf .data").block, true);
  assert.equal(evaluate("rm -rf /Users/x/code/agent-task-board/.data").block, true);
  assert.equal(evaluate("rm -f .data/board.json").block, true);
  assert.match(evaluate("rm -rf .data").reason, /live Agent Task Board state/);
});

test("deleting a throwaway/temp board dir is allowed", () => {
  assert.equal(evaluate('rm -rf "$D"').block, false); // captured mktemp var
  assert.equal(evaluate("rm -rf /var/folders/vl/x/atb-test.abcd/.data").block, false);
  assert.equal(evaluate("rm -rf $TMPDIR/atb/.data").block, false);
});

test("unrelated deletes (.next, node_modules) and reads of .data are allowed", () => {
  assert.equal(evaluate("rm -rf .next").block, false);
  assert.equal(evaluate("rm -rf node_modules").block, false);
  assert.equal(evaluate("ls .data").block, false);
  assert.equal(evaluate("cat .data/board.json").block, false);
});

test("git clean -x/-X (removes gitignored .data) is blocked; safe forms allowed", () => {
  assert.equal(evaluate("git clean -fdx").block, true);
  assert.equal(evaluate("git clean -X").block, true);
  assert.equal(evaluate("git clean -n").block, false);
  assert.equal(evaluate("git clean -fd").block, false);
});

test("unrelated commands pass", () => {
  assert.equal(evaluate("ls -la").block, false);
  assert.equal(evaluate("npm test").block, false);
  assert.equal(evaluate("").block, false);
  assert.equal(evaluate(undefined).block, false);
});
