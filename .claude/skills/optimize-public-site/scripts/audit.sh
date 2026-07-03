#!/usr/bin/env bash
# Baseline audit for optimize-public-site.
# Usage: ./audit.sh <url> [rate-limit-endpoint]
#   <url>                 page to audit (required)
#   [rate-limit-endpoint] endpoint to hammer for the rate-limit check (optional)
set -uo pipefail

URL="${1:-}"
RL_ENDPOINT="${2:-}"
if [ -z "$URL" ]; then
  echo "usage: $0 <url> [rate-limit-endpoint]" >&2
  exit 1
fi

line() { printf '\n=== %s ===\n' "$1"; }

line "Response headers ($URL)"
# -I = headers only; flag the security headers we care about.
curl -sSI "$URL" | grep -iE \
  '^(HTTP/|strict-transport-security|content-security-policy|x-content-type-options|x-frame-options|referrer-policy|permissions-policy|x-powered-by|server|cache-control|etag|last-modified|x-vercel-cache|cf-cache-status):' \
  || echo "(no headers returned)"

line "Lighthouse (seo, performance, best-practices)"
if command -v lighthouse >/dev/null 2>&1 || command -v npx >/dev/null 2>&1; then
  # shellcheck disable=SC2016  # node -e body is intentionally single-quoted; no shell expansion wanted
  npx --yes lighthouse "$URL" \
    --only-categories=seo,performance,best-practices \
    --quiet --chrome-flags="--headless" \
    --output=json --output-path=stdout 2>/dev/null \
  | node -e '
      let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
        try{const r=JSON.parse(d);
          for(const k of ["performance","seo","best-practices"]){
            const c=r.categories[k]; if(c) console.log(`${c.title}: ${Math.round(c.score*100)}/100`);
          }
        }catch(e){console.log("(lighthouse output unparseable — run manually with --view)")}
      });' \
  || echo "(lighthouse failed — ensure Chrome is installed)"
else
  echo "(npx/lighthouse not found — skipping)"
fi

line "Rate-limit check"
if [ -n "$RL_ENDPOINT" ]; then
  echo "50 requests to $RL_ENDPOINT — expect 200s then 429s if limited:"
  for _ in $(seq 1 50); do
    curl -s -o /dev/null -w "%{http_code}\n" "$RL_ENDPOINT"
  done | sort | uniq -c
else
  echo "(no endpoint given — pass one as arg 2 to test rate limiting)"
fi

line "Done"
