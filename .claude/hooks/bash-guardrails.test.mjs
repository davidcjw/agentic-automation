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

test("unrelated commands pass", () => {
  assert.equal(evaluate("ls -la").block, false);
  assert.equal(evaluate("npm test").block, false);
  assert.equal(evaluate("").block, false);
  assert.equal(evaluate(undefined).block, false);
});
