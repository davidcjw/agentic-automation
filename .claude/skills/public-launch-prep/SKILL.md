---
name: public-launch-prep
description: Meta skill that prepares a project for public open-source release by running three skills in sequence — traverse-repo (map the codebase into CODEBASE.md), opensource-readme (make the README and repo open-source ready), and optimize-public-site (harden and SEO-optimize the public site/API). Use when the user wants to fully prepare, launch, ship, or open-source a project for public release, or asks to "get this repo ready to publish", "do the full open-source prep", or run all three of those skills together.
---

# Public Launch Prep

A meta skill that runs three skills back-to-back to take a project from private to publicly launched. The order is deliberate: understand the code first, then document it for the public, then harden the deployed surface.

## Sequence

Run each skill to completion before starting the next. Each builds on the previous one's output.

1. **`traverse-repo`** — Deeply explore the repo and write `CODEBASE.md` at the root.
   *Why first:* the codebase map gives accurate context (entrypoints, architecture, key interfaces) that makes the README and optimization steps correct rather than guessed.

2. **`opensource-readme`** — Audit and complete the README, add License/Contributing/Code of Conduct, badges, demo media, favicon/OG image, and set the GitHub repo description + topics.
   *Why second:* uses the `CODEBASE.md` map from step 1 to describe the project accurately; produces the public-facing docs before the site is hardened.

3. **`optimize-public-site`** — Harden and SEO-optimize the publicly exposed site/API: meta tags, structured data, sitemaps, Core Web Vitals, caching, security headers, rate limiting, and API authz/input-validation checks.
   *Why last:* operates on the finished, documented project and the live deployment surface.

## Workflow

1. Confirm the project is in a git repository and identify the deployment target (if any) so step 3 has a concrete surface to optimize. If there is no public site/API, note that step 3 will be limited to source-level SEO/meta work.
2. Invoke the `traverse-repo` skill. Let it finish and write `CODEBASE.md`.
3. Invoke the `opensource-readme` skill. Let it finish its README/repo changes.
4. Invoke the `optimize-public-site` skill. Let it finish its hardening/SEO changes.
5. Summarize what each step produced and flag anything that needs user follow-up (e.g. missing demo GIF, undecided license, deployment env vars).

## Notes

- Invoke each sub-skill through its own Skill tool call — do not reimplement their logic here. This skill only orchestrates order and hands off context between them.
- If the user only wants a subset, run only the relevant skills; the ordering rule (understand → document → harden) still holds.
- Stop and ask the user before any irreversible or outward-facing action a sub-skill proposes (e.g. changing the GitHub repo description, pushing commits).
