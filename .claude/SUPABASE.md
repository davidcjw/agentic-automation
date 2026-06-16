# Supabase Security Rules

## The core model
- RLS is the security boundary, NOT key secrecy. The `anon` key is public by design (it ships in browsers). Assume any attacker has it plus your project URL, and that every `public`-schema table/function is reachable at `/rest/v1/…`.
- Every table in an API-exposed schema MUST have RLS enabled. RLS on + no policy = deny-all (safe default); add policies only to open up specific access.
- `service_role` key bypasses RLS entirely. It is server-only — NEVER put it in client code, `NEXT_PUBLIC_*` vars, or anything shipped to a browser. If it leaks, RLS is irrelevant.

## Keys & access
- Browser code uses the `anon` key + RLS. Server code (route handlers, cron, scripts) uses `service_role`.
- Never prefix a Supabase URL or service key with `NEXT_PUBLIC_` / `VITE_` / `PUBLIC_`. Grep for this before shipping.
- Keep keys in env vars; never commit `.env*` (only `.env.example` with placeholders).

## Functions (RPC)
- `SECURITY DEFINER` functions in `public` are callable by `anon` via `/rest/v1/rpc/<name>` unless you revoke it. Default to `SECURITY INVOKER`; use `DEFINER` only deliberately.
- For any privileged/admin function, `REVOKE EXECUTE … FROM anon, authenticated, public` and grant only to the role that needs it (often just `service_role`).
- Never expose a generic "run arbitrary SQL" RPC to `anon`/`authenticated`. If one exists for server tooling, lock it to `service_role`.
- Set an explicit `search_path` on `SECURITY DEFINER` functions to prevent hijacking.

## Operating discipline
- After ANY schema/DDL change, run the security advisor (`get_advisors type=security`) and resolve ERROR-level lints before considering the work done.
- Prefer migrations over ad-hoc DDL so security changes are reviewable and reproducible.
- Smoke-test the app's real access path after locking things down — verify `service_role` paths still work and `anon` is actually denied. Revoking from `public` can affect roles that relied on it.
- Enable Auth leaked-password protection (HaveIBeenPwned) and set sensible password rules if using Supabase Auth.
- Don't put secrets in tables readable under permissive policies; keep service-only data in tables with no `anon`/`authenticated` policies.
