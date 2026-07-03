#!/usr/bin/env node
// PostToolUse:Edit|Write. Runs the repo's LOCAL prettier on the file just touched.
// Best-effort and non-blocking: skips silently if no local prettier is resolvable.
import { existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".scss", ".json", ".md", ".mdx", ".html", ".yml", ".yaml"]);

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const file = input?.tool_input?.file_path;
  if (!file || !existsSync(file) || !EXTS.has(extname(file))) process.exit(0);

  // Walk up to find the nearest node_modules/.bin/prettier.
  let dir = dirname(file);
  let bin = null;
  for (let i = 0; i < 12; i++) {
    const candidate = join(dir, "node_modules", ".bin", "prettier");
    if (existsSync(candidate)) { bin = candidate; break; }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (!bin) process.exit(0); // no local prettier -> don't touch anything

  execFileSync(bin, ["--write", "--log-level", "warn", file], { stdio: "ignore" });
} catch {
  // Formatting failures should never block or noise up the session.
  process.exit(0);
}
process.exit(0);
