---
name: vercel-domain-setup
description: Add a custom domain to an existing Vercel project and automatically configure the required DNS records on GoDaddy. Use when the user says "add domain to Vercel", "set up DNS for Vercel", "link my domain to Vercel", or wants to connect a GoDaddy domain to a deployed Vercel app.
---

# Vercel Domain Setup

Adds a custom domain to a Vercel project and wires up GoDaddy DNS in one pass.

## Prerequisites

- Vercel CLI installed and authenticated (`vercel whoami` should return your username)
- `godaddy-dns` MCP server running with `GODADDY_API_KEY` + `GODADDY_API_SECRET` set
- Vercel project already deployed

## Auth: how to get the Vercel token

The Vercel CLI stores its auth token locally — no manual token needed. Extract it at runtime:

```bash
python3 -c "import json; print(json.load(open('/Users/$(whoami)/Library/Application Support/com.vercel.cli/auth.json'))['token'])"
```

Use this value as `$VERCEL_TOKEN` in all API calls below.

## Workflow

### 1 — Identify the project

Use `mcp__claude_ai_Vercel__list_projects` or `mcp__claude_ai_Vercel__get_project` to confirm the project name/ID. Grab the team ID from `mcp__claude_ai_Vercel__list_teams` if it's a team project.

### 2 — Add the domain to Vercel

```bash
VERCEL_TOKEN=$(python3 -c "import json; print(json.load(open('/Users/$(whoami)/Library/Application Support/com.vercel.cli/auth.json'))['token'])")

curl -s -X POST "https://api.vercel.com/v10/projects/{PROJECT_ID}/domains?teamId={TEAM_ID}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "the-domain.com"}'
```

Omit `?teamId=...` for personal projects.

Parse the JSON response for:
- `verified` — whether Vercel already recognises the domain
- `verification[]` — any TXT records needed for ownership verification

### 3 — Determine DNS records

| Domain type | DNS record | Name | Value |
|---|---|---|---|
| Apex (`example.com`) | A | `@` | `76.76.21.21` |
| Subdomain (`app.example.com`) | CNAME | `app` | `cname.vercel-dns.com` |
| Verification (if returned) | TXT | as given | as given |

The GoDaddy root domain is always the apex (e.g. `example.com`), even when adding a subdomain record.

### 4 — Apply DNS records on GoDaddy

Use `replace_dns_records` to ensure a clean single record (no duplicates):

- **Apex A record:**
  `replace_dns_records(domain="example.com", record_type="A", name="@", data="76.76.21.21", ttl=600)`

- **Subdomain CNAME:**
  `replace_dns_records(domain="example.com", record_type="CNAME", name="app", data="cname.vercel-dns.com", ttl=600)`

- **Verification TXT** (if `verification[]` was non-empty):
  `add_dns_record(domain="example.com", record_type="TXT", name="{verification.domain minus root}", data="{verification.value}", ttl=600)`
  > Strip the root domain to get the record name. E.g. `_vercel.example.com` → name is `_vercel`.

### 5 — Optional: www redirect

Ask the user if they want `www` to redirect to the apex (recommended). If yes:
1. `replace_dns_records(domain="example.com", record_type="CNAME", name="www", data="cname.vercel-dns.com", ttl=600)`
2. Repeat step 2 adding `www.example.com` as a second domain on the same project.

### 6 — Poll for verification, then clean up

If `verification[]` was non-empty in step 2, start a self-paced loop (~5 min) to:

1. **Force Vercel to re-check** (don't wait for passive polling — call the verify endpoint directly):
   ```js
   // ctx_execute / JS fetch
   POST https://api.vercel.com/v9/projects/{PROJECT_ID}/domains/{DOMAIN}/verify?teamId={TEAM_ID}
   Authorization: Bearer {VERCEL_TOKEN}
   ```

2. **If `verified: true`:**
   - Delete the TXT record: `delete_dns_record(domain="example.com", record_type="TXT", name="_vercel")`
   - Send a PushNotification: `"{domain} is live on Vercel — TXT verification record cleaned up."`
   - **Stop the loop.**

3. **If still `verified: false`:** confirm DNS is actually resolving before waiting again:
   ```js
   // ctx_execute / JS — use child_process execSync
   execSync('dig +short TXT _vercel.example.com').toString().trim()
   execSync('dig +short CNAME subdomain.example.com').toString().trim()
   ```
   If `dig` returns no results, DNS hasn't propagated yet — wait and retry.
   If `dig` returns the correct values but Vercel is still unverified, keep calling the verify endpoint each loop.

4. Schedule next wakeup at 270s (under the 5-min cache window), prompt `/loop every 5 mins until it's done`.

### 7 — Summarise

Report:
- Domain added to Vercel project ✓
- DNS records applied to GoDaddy ✓
- Verification loop started — will auto-clean TXT record and notify when live

## Common errors

| Error | Fix |
|---|---|
| `invalid_domain` from Vercel | Domain already on another Vercel project — remove it there first |
| `403` from Vercel API | CLI token expired — run `vercel login` to refresh |
| `422` from GoDaddy | Record name includes the root domain — strip it (e.g. use `app` not `app.example.com`) |
| GoDaddy `UNABLE_TO_AUTHENTICATE` | API key/secret wrong or using OTE (test) keys against production |
