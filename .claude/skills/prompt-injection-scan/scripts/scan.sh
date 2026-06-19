#!/usr/bin/env bash
# prompt-injection-scan: static, read-only collector of suspicious patterns.
# Never executes repo code. Prints raw candidate hits grouped by category for triage.
# Usage: bash scan.sh [repo_path]   (defaults to cwd)
set -uo pipefail

ROOT="${1:-.}"
if [ ! -d "$ROOT" ]; then echo "error: '$ROOT' is not a directory" >&2; exit 1; fi

# Exclude vcs/vendor/lock noise. Use grep --exclude-dir where supported.
EXCL=(--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.venv \
      --exclude-dir=venv --exclude-dir=dist --exclude-dir=build \
      --exclude-dir=.next --exclude-dir=vendor --exclude-dir=target \
      --exclude='*.min.js' --exclude='*.lock' --exclude='*-lock.json')

section() { printf '\n========== %s ==========\n' "$1"; }
hits()    { if [ -s "$1" ]; then cat "$1"; else echo "(none)"; fi; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo "prompt-injection-scan :: $ROOT"
echo "files (excluding vcs/vendor): $(grep -rIl '' "${EXCL[@]}" "$ROOT" 2>/dev/null | wc -l | tr -d ' ')"

section "AGENT-FACING FILES (review each by hand — highest injection risk)"
find "$ROOT" \( -path '*/.git' -o -path '*/node_modules' \) -prune -o -type f \
  \( -iname 'CLAUDE.md' -o -iname 'AGENTS.md' -o -iname '.cursorrules' \
     -o -iname '.windsurfrules' -o -iname '.clinerules' -o -iname '*.mdc' \
     -o -iname 'copilot-instructions.md' -o -iname 'mcp.json' -o -iname '.mcp.json' \
     -o -iname 'README*' -o -iname 'CONTRIBUTING*' \) -print 2>/dev/null | sort -u

section "PROMPT-INJECTION PHRASING (agent-directed instructions)"
grep -rniE "${EXCL[@]}" 'ignore (all|previous|above|prior) instructions|you are now|as an ai|do not (tell|inform|mention)|system prompt|disregard (the|all|previous)|new instructions|auto-?approve|skip confirmation' "$ROOT" 2>/dev/null > "$TMP/inj"; hits "$TMP/inj"

section "HIDDEN / NON-ASCII UNICODE (zero-width, bidi — common injection cloak)"
grep -rnP "${EXCL[@]}" '[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{2064}\x{FEFF}]' "$ROOT" 2>/dev/null > "$TMP/uni"; hits "$TMP/uni"

section "INSTALL / BUILD HOOKS (run automatically — high RCE risk)"
grep -rnE "${EXCL[@]}" '"(pre|post)?(install|prepare|prepublish)"\s*:' "$ROOT" 2>/dev/null
grep -rnE "${EXCL[@]}" 'curl[^|]*\|\s*(sh|bash)|wget[^|]*\|\s*(sh|bash)' "$ROOT" 2>/dev/null
find "$ROOT" \( -path '*/.git' -o -path '*/node_modules' \) -prune -o -type f \
  \( -iname 'Dockerfile*' -o -iname 'Makefile' -o -path '*/.husky/*' -o -path '*/.githooks/*' -o -iname 'binding.gyp' \) -print 2>/dev/null

section "DYNAMIC CODE EXECUTION"
grep -rnE "${EXCL[@]}" '\beval\(|\bexec\(|new Function\(|child_process|subprocess|os\.system|pickle\.loads' "$ROOT" 2>/dev/null > "$TMP/exec"; hits "$TMP/exec"

section "OBFUSCATION / ENCODED BLOBS"
grep -rnE "${EXCL[@]}" 'atob\(|fromCharCode|base64\.b64decode|[A-Za-z0-9+/]{120,}={0,2}' "$ROOT" 2>/dev/null > "$TMP/obf"; hits "$TMP/obf"

section "OUTBOUND NETWORK"
grep -rniE "${EXCL[@]}" 'fetch\(|axios|requests\.(get|post)|urllib|http\.request|net\.connect|XMLHttpRequest' "$ROOT" 2>/dev/null > "$TMP/net"; hits "$TMP/net"

section "CREDENTIAL / SECRET ACCESS"
grep -rniE "${EXCL[@]}" '\.ssh|\.aws/credentials|\.netrc|id_rsa|process\.env|os\.environ|keychain|cookies\.sqlite|Login Data' "$ROOT" 2>/dev/null > "$TMP/cred"; hits "$TMP/cred"

section "REVERSE-SHELL SHAPES"
grep -rniE "${EXCL[@]}" '/dev/tcp/|bash -i|nc -e|sh -i|pty\.spawn' "$ROOT" 2>/dev/null > "$TMP/rev"; hits "$TMP/rev"

section "NON-REGISTRY / GIT-URL DEPENDENCIES"
grep -rniE "${EXCL[@]}" 'git\+|https?://[^"]+\.(tar|tgz|zip)|"file:' "$ROOT" 2>/dev/null > "$TMP/dep"; hits "$TMP/dep"

echo
echo "Done. Triage each section; weight auto-running code highest. Cite file:line in the report."
