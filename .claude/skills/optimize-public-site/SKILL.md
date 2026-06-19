---
name: optimize-public-site
description: Harden and SEO-optimize a publicly exposed website or API — meta tags, structured data, sitemaps, Core Web Vitals, caching, compression, security headers, rate limiting (edge/CDN first, app-level fallback), plus API-specific authz/IDOR, input validation, SSRF, and error-leakage checks. Use when the user wants to make a public site/page/API SEO-friendly, search-rankable, faster, more secure, protected against abuse/DDoS, rate limited, or asks to "optimize", "harden", or "production-proof" a public-facing web app or backend.
---

# Optimize Public Site

Two goals for any public-facing page or API: **be discoverable + fast** (SEO + performance) and **be hard to abuse** (security + rate limit). Work the checklists below; pull code from [REFERENCE.md](REFERENCE.md). For backends, also do the **API checklist**.

## Workflow

1. **Detect the stack.** Check `package.json` / framework. Branch examples accordingly (Next.js is the worked example; map to static/Node/other as needed). Identify host (Vercel, Cloudflare, nginx) — it determines where rate limiting lives.
2. **Audit first, don't guess.** Run a baseline so you optimize what's actually broken:
   - `scripts/audit.sh <url> [rate-limit-endpoint]` — runs headers + Lighthouse scores + rate-limit check in one shot.
   - Then grep the codebase for existing meta tags, `robots.txt`, `sitemap.xml`, and security headers to see what's already there.
3. **Apply SEO fixes** (see checklist + REFERENCE §SEO).
4. **Apply security headers + rate limiting** (see checklist + REFERENCE §Security, §Rate limiting).
5. **Verify.** Re-run `scripts/audit.sh` for the before/after diff, validate structured data (search.google.com/test/rich-results), and confirm the rate limit trips. Report the delta.

## SEO checklist

- [ ] Unique `<title>` (≤60 chars) + `meta description` (≤160) per page
- [ ] `<link rel="canonical">` to avoid duplicate-content penalties
- [ ] Open Graph + Twitter Card tags (social preview)
- [ ] JSON-LD structured data (Organization / Article / Product / BreadcrumbList)
- [ ] `robots.txt` (allow crawl, link sitemap) + `sitemap.xml` (generated, not hand-kept)
- [ ] Semantic HTML: one `<h1>`, logical heading order, `<main>`/`<nav>`/`<article>`
- [ ] `alt` on all meaningful images; lazy-load below the fold; modern formats (WebP/AVIF)
- [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms (preconnect, preload critical, size images)
- [ ] Caching: `immutable` for hashed assets, `s-maxage` + `stale-while-revalidate` for HTML, `ETag`/`Last-Modified` (REFERENCE §Caching)
- [ ] Compression on (Brotli/gzip) + HTTP/2 or HTTP/3 enabled (REFERENCE §Performance)
- [ ] Bundle hygiene: code-split, tree-shake, `font-display: swap`, self-hosted subset fonts
- [ ] `<meta viewport>` + mobile responsive (mobile-first indexing)
- [ ] `favicon` + `manifest`; clean human-readable URLs; `hreflang` if multi-locale
- [ ] No broken links / orphan pages; meaningful internal linking

## Security checklist

- [ ] **Rate limiting** — edge/CDN rule first (Cloudflare/Vercel WAF), app middleware fallback for per-route limits (REFERENCE §Rate limiting)
- [ ] Security headers: HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy (REFERENCE §Security)
- [ ] Force HTTPS (301 http→https); HSTS preload once confident
- [ ] Remove fingerprinting headers (`X-Powered-By`, server version)
- [ ] Cookies: `HttpOnly`, `Secure`, `SameSite`
- [ ] No secrets in client bundle; env vars server-side only; grep build output for keys
- [ ] Validate/sanitize all input; CSRF tokens on state-changing forms; CAPTCHA on public forms
- [ ] CORS locked to known origins (not `*` for credentialed routes)
- [ ] `npm audit` / Dependabot; SRI on third-party `<script>`/`<link>`
- [ ] `noindex` on admin/staging; disable directory listing
- [ ] TLS 1.2+/1.3 only, auto-renewing cert; DNS `CAA` record (+ DNSSEC if supported)
- [ ] `/.well-known/security.txt` with a disclosure contact (REFERENCE §Security)

## API checklist

For any public API/backend, in addition to rate limiting + security headers above:

- [ ] **Authn**: keys/OAuth2/JWT validated on every request; rotate + scope credentials
- [ ] **Authz / IDOR**: check the caller owns each resource — never trust an ID from the URL/body
- [ ] **Schema-validate input** at the boundary (zod/JSON-schema); reject unknown fields (mass-assignment)
- [ ] **No error leakage**: generic messages in prod, no stack traces / DB errors / internal paths
- [ ] **Limits**: max body size + request timeout (cheap DoS guards); pagination on all list endpoints
- [ ] **SSRF guard**: if fetching user URLs, allowlist hosts + block internal/metadata IP ranges
- [ ] **Conditional GETs** (`ETag`/`If-None-Match` → 304); `private, no-store` on authed responses
- [ ] Idempotency keys on writes; verify webhook signatures
- [ ] **GraphQL**: disable introspection in prod; enforce query depth/complexity limits
- [ ] CORS allowlist (not `*`) for credentialed/cross-origin API calls

(See REFERENCE §API for snippets.)

## Notes

- **Edge-first rate limiting** absorbs floods before they hit the origin (cheaper, DDoS-resistant). Add app-level limits only where you need per-user/per-route granularity.
- Don't over-tighten CSP blind — start in `Content-Security-Policy-Report-Only`, watch reports, then enforce.
- Performance *is* SEO: Core Web Vitals are a Google ranking signal, so perf wins double.

## Operate / go further

One-shot hardening isn't enough — wire up ongoing signals:
- **Observability**: error tracking (Sentry), uptime monitor, RUM for real-world Core Web Vitals, and ingest CSP violation reports.
- **Supply chain**: commit lockfiles, enable Dependabot/SCA; generate an SBOM for compliance-sensitive projects.
- **Deeper scans**: go beyond Lighthouse with OWASP ZAP or `nuclei` for a real vuln pass before launch.
