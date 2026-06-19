# Reference — copy-paste snippets

Framework-neutral where possible; Next.js (App Router) as primary example. Adapt paths/APIs to the detected stack.

---

## SEO

### Per-page metadata (Next.js App Router)

```ts
// app/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Title — Brand",            // ≤60 chars
  description: "Compelling 1–2 sentence summary.", // ≤160 chars
  alternates: { canonical: "https://example.com/page" },
  openGraph: {
    title: "Page Title",
    description: "Summary for social cards.",
    url: "https://example.com/page",
    siteName: "Brand",
    images: [{ url: "https://example.com/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Page Title", images: ["https://example.com/og.png"] },
  robots: { index: true, follow: true },
};
```

Plain HTML equivalent goes in `<head>`: `<title>`, `<meta name="description">`,
`<link rel="canonical">`, `<meta property="og:*">`, `<meta name="twitter:*">`.

### JSON-LD structured data

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Brand",
  url: "https://example.com",
  logo: "https://example.com/logo.png",
}) }} />
```

Swap `@type` for `Article`, `Product`, `BreadcrumbList`, `FAQPage`, etc.
Validate at https://search.google.com/test/rich-results.

### robots.txt (`app/robots.ts` or `public/robots.txt`)

```ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: "https://example.com/sitemap.xml",
  };
}
```

### sitemap.xml — generate, don't hand-maintain

- Next.js: `app/sitemap.ts` returning `MetadataRoute.Sitemap`, or `next-sitemap` package.
- Static sites: a build script that walks routes.
- List canonical URLs + `lastModified`; keep < 50k URLs / 50MB per file.

### Core Web Vitals quick wins

- `<link rel="preconnect">` to font/CDN origins; `rel="preload"` the LCP image/font.
- Always set explicit `width`/`height` (or `aspect-ratio`) to kill CLS.
- Use framework image components (`next/image`) → WebP/AVIF, lazy load, responsive `srcset`.
- Defer non-critical JS; avoid layout-shifting late-loaded banners.
- Measure: `npx lighthouse <url>` or https://pagespeed.web.dev.

### Caching

Cached responses are faster, cheaper, and DDoS-resilient — a CDN-cached page never touches your
origin, so it can't be abused. Set `Cache-Control` per content type:

| Content | Header |
|---|---|
| Hashed/static assets (`/_next/static`, fingerprinted JS/CSS/images) | `public, max-age=31536000, immutable` |
| HTML / dynamic pages | `public, max-age=0, s-maxage=600, stale-while-revalidate=86400` |
| Per-user / private responses | `private, no-store` (never cache at the CDN) |

- `max-age` = browser cache; `s-maxage` = CDN/shared cache (overrides `max-age` there).
- `stale-while-revalidate` serves the stale copy instantly while refreshing in the background — best perceived speed.
- `immutable` tells the browser never to revalidate — safe only for content-hashed filenames.
- Add `ETag`/`Last-Modified` so clients can revalidate with a cheap `304 Not Modified` instead of refetching.

**Vercel** — `vercel.json`:

```json
{ "headers": [
  { "source": "/_next/static/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
  { "source": "/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400" }] }
]}
```

**Next.js** — ISR handles HTML caching: `export const revalidate = 600` (App Router) or
`revalidate: 600` from `getStaticProps`. Static assets get `immutable` headers automatically.

**nginx** — cache static, revalidate HTML:

```nginx
location ~* \.(js|css|woff2|png|jpg|svg)$ { add_header Cache-Control "public, max-age=31536000, immutable"; }
location / { add_header Cache-Control "public, no-cache"; etag on; }
```

- Verify what's actually cached: `curl -sI <url>` and read `Cache-Control`, `ETag`, and the CDN's
  `x-vercel-cache` / `cf-cache-status` (`HIT` vs `MISS`) header.

### Performance — transport & bundle

- **Compression** — serve Brotli (`br`) with gzip fallback. Managed hosts (Vercel/Cloudflare/Netlify)
  do this automatically; on nginx enable `gzip on;` + the `brotli` module. Verify: response carries
  `Content-Encoding: br`.
- **HTTP/2 / HTTP/3 (QUIC)** — multiplexes requests over one connection; usually a host/CDN toggle
  (on by default on Vercel/Cloudflare). On self-hosted nginx, `listen 443 ssl http2;` (+ HTTP/3 module).
- **Bundle hygiene** — code-split routes, tree-shake, drop unused deps. Inspect with
  `npx @next/bundle-analyzer` or `npx source-map-explorer`. Ship modern ES (smaller than transpiled ES5).
- **Fonts** — self-host a subset, set `font-display: swap`, preload the one used above the fold;
  avoid pulling whole families from a third-party origin.

---

## Security

### Security headers

**Vercel** — `vercel.json`:

```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
      { "key": "Content-Security-Policy", "value": "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'" }
    ]
  }]
}
```

**Next.js** — same keys via `headers()` in `next.config.js`.
**nginx** — `add_header` directives in the server block.

CSP rollout: ship as `Content-Security-Policy-Report-Only` with a `report-uri`/`report-to`
first, watch for breakage, then promote to enforcing.

### Remove fingerprinting

- Next.js: `poweredByHeader: false` in `next.config.js`.
- nginx: `server_tokens off;`.

### CSP without `unsafe-inline`

`script-src 'self' 'unsafe-inline'` defeats much of CSP's XSS protection. Prefer per-response
nonces (`script-src 'self' 'nonce-<random>'`) or hashes for the inline scripts you control.
Next.js can inject a nonce via middleware; for cross-origin isolation add
`Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Resource-Policy: same-origin`.

### TLS & DNS

- TLS 1.2+ / 1.3 only, modern ciphers, OCSP stapling; auto-renew certs (Let's Encrypt / managed).
- DNS `CAA` record to restrict which CAs may issue for your domain; enable DNSSEC if the registrar supports it.
- Watch for subdomain takeover: remove dangling CNAMEs pointing at de-provisioned services.
- Grade it: https://www.ssllabs.com/ssltest and https://securityheaders.com.

### security.txt — `/.well-known/security.txt`

```
Contact: mailto:security@example.com
Expires: 2027-01-01T00:00:00Z
Preferred-Languages: en
Canonical: https://example.com/.well-known/security.txt
```

Serve it as static text. Gives researchers a disclosure channel (RFC 9116).

---

## Rate limiting

### Tier 1 — Edge/CDN (preferred, do this first)

Absorbs abuse before it reaches the origin; survives DDoS; no app code.

- **Cloudflare** → Security → WAF → Rate limiting rules. e.g. `> 100 requests / 1 min per IP`
  to a path → Block / Managed Challenge. Add Bot Fight Mode + a managed WAF ruleset.
- **Vercel** → Firewall → Rate limiting rules in the dashboard, or `@vercel/firewall`
  (`checkRateLimit`) in code for programmatic rules.
- Scope tightly: stricter on `/api/*`, login, and form endpoints than on static pages.

### Tier 2 — App-level (per-route / per-user granularity)

Use when edge rules can't express the logic (per-user quotas, cost-based limits).

```ts
// middleware.ts — Upstash Redis sliding-window
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "10 s"), // 20 req / 10s per key
  analytics: true,
});

export async function middleware(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);
  if (!success) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) },
    });
  }
  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  return res;
}

export const config = { matcher: ["/api/:path*"] };
```

- No Redis? In-memory token-bucket works for a single instance only (resets on deploy,
  not shared across serverless instances) — fine for low-stakes, not for real protection.
- Always return `429` + `Retry-After`; expose `X-RateLimit-*` headers for good clients.
- Key on a real identifier (authenticated user id > IP), since IPs are shared/spoofable.

### Verify

```bash
for i in $(seq 1 50); do curl -s -o /dev/null -w "%{http_code}\n" https://example.com/api/x; done | sort | uniq -c
```

Expect a burst of `200` then `429`s once the window trips.

---

## API

Public APIs need everything above (rate limiting, security headers, caching) plus these
boundary concerns. Examples are framework-neutral with Next.js route handlers as the model.

### Validate input at the boundary

```ts
import { z } from "zod";

const Body = z.object({ email: z.string().email(), qty: z.number().int().positive().max(100) })
  .strict(); // .strict() rejects unknown keys → blocks mass-assignment

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  // ...use parsed.data
}
```

### Authz / IDOR — the #1 API vuln

Never trust an ID from the URL/body. Confirm the *caller* owns the resource:

```ts
const order = await db.order.findUnique({ where: { id: params.id } });
if (!order || order.userId !== session.userId) {
  return Response.json({ error: "Not found" }, { status: 404 }); // 404 not 403 — don't leak existence
}
```

### Don't leak errors

```ts
try { /* ... */ } catch (err) {
  console.error(err);                       // full detail to logs only
  return Response.json({ error: "Internal error" }, { status: 500 }); // generic to client
}
```

No stack traces, DB messages, or internal paths in responses. Disable verbose framework error
pages in production.

### DoS guards

- **Body size**: cap request bodies (Next.js route config / nginx `client_max_body_size 1m;`).
- **Timeouts**: set per-request timeouts so slow/slowloris clients can't hold connections.
- **Pagination**: every list endpoint takes `limit` (capped) + cursor; never return unbounded sets.

### SSRF — if the API fetches user-supplied URLs

Allowlist destination hosts; resolve the host and reject private/loopback/link-local ranges
(`10.0.0.0/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254.169.254` cloud metadata). Block redirects
to those ranges too.

### Conditional GET & cache posture

- Return `ETag`; honor `If-None-Match` with `304 Not Modified` to skip re-sending bodies.
- Authed/personalized responses: `Cache-Control: private, no-store` so no CDN/proxy caches them.
- Public, cacheable GETs: `s-maxage` + `stale-while-revalidate` (see §Caching).

### Writes & webhooks

- **Idempotency keys**: accept an `Idempotency-Key` header on POST/PUT so retries don't double-charge.
- **Webhooks**: verify the HMAC signature header against the raw body before trusting any payload.

### GraphQL

- Disable introspection in production.
- Enforce query **depth** and **complexity** limits (e.g. `graphql-depth-limit`) — a single nested
  query can otherwise DoS the resolver.
- Disable batching or cap batch size if not needed.
