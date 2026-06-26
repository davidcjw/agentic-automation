---
name: opensource-readme
description: Transforms a project's README into an open-source-ready format by auditing existing content and adding missing standard sections (License, Contributing, Code of Conduct, Badges, Installation, Usage, Roadmap, Acknowledgements), embedding a demo GIF/screenshot where relevant, ensuring a favicon and Open Graph image are present for frontend projects, and setting the GitHub repo description plus relevant topic tags. Use when user wants to open-source a project, make a README complete, prepare a repo for public release, or asks to "add open source sections", "make this open source ready", or "improve the README".
---

# Open Source README

Audit and enhance a README so it meets open-source community standards. Preserve all existing content — only add or expand, never remove.

## Standard sections (in order)

| Section | Required | Notes |
|---|---|---|
| Badges | Recommended | License, CI status, version |
| Description | Required | 1–2 sentence tagline |
| Demo (GIF/screenshot) | Recommended | Near the top, right after badges/description |
| Architecture diagram | Optional | Only for complex multi-component projects (see *Architecture diagram*) |
| Table of Contents | If README > 80 lines | |
| Installation | Required | |
| Usage | Required | At least one example |
| Contributing | Required | |
| Code of Conduct | Required | |
| License | Required | |
| Roadmap | Optional | |
| Acknowledgements | Optional | |

## Workflow

1. Read the existing README
2. Check for `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` files in repo root
3. Identify which sections are missing or thin
4. Add missing sections at the bottom in the order above
5. If a standalone file exists (e.g. `CONTRIBUTING.md`), link to it instead of inlining
6. For License: check LICENSE file for the license type; default to MIT if absent
7. For badges: add at least a license badge after the title
8. **Create `LICENSE` file** if it doesn't exist — write a plain text MIT License file at the repo root with the current year and the git user's name (from `git config user.name`). File must be named `LICENSE` with no extension.
9. **Embed a demo GIF/screenshot** near the top (see *Demo GIF*) — reuse an existing asset if present; otherwise add a placeholder and tell the user where to drop a recording.
10. **Set repo description** on GitHub (see *Repo description*) — derive a concise tagline, then apply with `gh`.
11. **Add repo topics** on GitHub (see *Repo topics*) — derive relevant tags from the stack and domain, then apply with `gh`.
12. **Check web assets** if the project ships a website/frontend (see *Web assets*) — ensure a favicon and an Open Graph image are present and wired up.
13. **(Optional) Add an architecture diagram** if the repo has many components that interact (see *Architecture diagram*) — only for genuinely complex projects with several moving parts.

## Section templates

### Contributing
```md
## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'feat: describe change'`)
4. Push and open a pull request

Please make sure tests pass before submitting a PR.
```

### Code of Conduct
```md
## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
By participating you agree to uphold a welcoming, harassment-free environment.
```

### License
```md
## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
```

### License badge (top of README, after title)
```md
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
```

### Demo (near the top, after badges/description)
```md
<p align="center">
  <img src="docs/demo.gif" alt="<Project name> demo" width="640">
</p>
```

## Demo GIF

Embed a visual demo high up so visitors see the project in action before reading.

1. **Reuse an existing asset first.** Search the repo for a demo recording or screenshot — `*.gif`, `*.mp4`, `*.webm`, or screenshots under `assets/`, `docs/`, `media/`, `.github/`, `public/`, `screenshots/`. Pick the most demo-like one.
2. **Place it** right after the badges/description, before the Table of Contents, using the centered template above. Always set descriptive `alt` text; a width of 600–720 reads well on GitHub.
3. **Never fabricate or hotlink** an unrelated image. If no asset exists, insert the placeholder pointing at `docs/demo.gif` and tell the user to record a short clip (e.g. with [vhs](https://github.com/charmbracelet/vhs) for CLIs, or a screen recorder → GIF) and drop it at that path.
4. GitHub renders `.gif` inline; for `.mp4`, upload it to a release/issue and use the resulting `user-images.githubusercontent.com` URL instead of a repo path.

## Architecture diagram

**Optional — skip for simple projects.** Only create this when the repo has **many components that interact with each other** (e.g. multiple services, a frontend + backend + workers + queue + DB, several packages in a monorepo, or non-trivial data/request flow worth visualizing). A single CLI, library, or small app does **not** need one.

1. **Judge complexity first.** Map the components and how they talk to each other. If there are only one or two moving parts, stop — no diagram.
2. **If complex enough**, build a high-level diagram showing **data/request flow** between the major components (services, stores, external APIs, etc.) — not a class-level UML, just the architecture at a glance.
3. **Create it with Excalidraw** (use the Excalidraw MCP tools). Export the diagram and save the image under `docs/` (e.g. `docs/architecture.png`), then embed it in the README under an `## Architecture` heading:
```md
## Architecture

<p align="center">
  <img src="docs/architecture.png" alt="<Project name> architecture" width="720">
</p>
```
4. **Never fabricate** components that don't exist — base the diagram on what's actually in the repo.

## Repo description

Set the GitHub repo's "About" description so visitors and search see what it is.

1. **Derive a concise tagline** (≤120 chars) from the README's description/tagline — say what the project does, not how it's built. Reuse the README's one-liner if it's good.
2. **Apply** from the repo root:
```bash
gh repo edit --description "Fast OSRS gear & DPS calculator built with Next.js"
```
3. **Verify**: `gh repo view --json description -q '.description'`
4. If `gh` isn't installed/authed or there's no GitHub remote, **don't fail** — show the suggested description and tell the user to set it via the repo's **About → ⚙**.

## Repo topics

Add GitHub topics so the repo is discoverable.

1. **Derive 5–15 relevant topics** from: the primary language; framework / key libraries (read the manifest — `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.); the project's domain / purpose (from the README); and notable tools or platforms (e.g. `vercel`, `docker`, `cli`).
2. **Normalize to GitHub's rules**: lowercase, words joined by hyphens, ≤50 chars each, **max 20 topics**.
3. **Apply** from the repo root (adds without clobbering existing topics):
```bash
gh repo edit --add-topic nextjs,typescript,tailwindcss,osrs,calculator
```
4. **Verify**: `gh repo view --json repositoryTopics -q '.repositoryTopics[].name'`
5. If `gh` isn't installed/authed or there's no GitHub remote, **don't fail** — list the suggested topics and tell the user to add them via the repo's **About → ⚙ → Topics**.

## Web assets

Only if the project ships a website/frontend (e.g. a `public/`, `static/`, `app/`, or `index.html` exists). Skip for pure CLIs/libraries.

### Favicon

1. **Check it exists**: look for `favicon.ico` / `favicon.svg` / `favicon.png` under `public/`, `static/`, `app/`, or the site root, and a `<link rel="icon">` (or framework metadata like Next.js `app/icon.*` / `metadata.icons`) wiring it in.
2. **If missing**, add one — reuse an existing logo/mark if present (convert to `favicon.ico`/`favicon.svg`); otherwise drop a placeholder and tell the user to supply a brand mark. Wire it into the `<head>` or framework metadata.

### Open Graph image

1. **Check it exists**: look for an OG image (`og-image.png`, `opengraph-image.*`, social-card asset, ~1200×630) and the `<meta property="og:image">` + `<meta name="twitter:image">` tags (or framework metadata like Next.js `app/opengraph-image.*` / `metadata.openGraph.images`).
2. **Verify the full OG/Twitter set** is present: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, and `twitter:card` (`summary_large_image`).
3. **If missing**, add the meta tags and reference an OG image — reuse a screenshot/demo asset if suitable, or add a `public/og-image.png` placeholder (1200×630) and tell the user to replace it. Use an absolute URL for `og:image` (relative paths don't preview on most platforms).
4. **Never fabricate or hotlink** an unrelated image — use a placeholder path if no asset exists.

## Rules

- Never delete or reorder existing sections
- Match the heading style already used (# vs ##)
- Always create `LICENSE` if absent — do not just note it; write the file
- Keep all additions concise — link out rather than inline large docs
- Demo: reuse existing media; never fabricate or hotlink unrelated images — use the placeholder path if none exists
- Topics: lowercase + hyphens, ≤20, relevant to stack/domain; use `--add-topic` (never replace existing topics)
- Description: ≤120 chars, says what the project does; reuse the README tagline; never fail if `gh`/remote is unavailable — surface the suggestion instead
- Web assets: only for projects shipping a frontend; ensure favicon + OG image exist and are wired into `<head>`/framework metadata; reuse existing brand assets, never fabricate or hotlink; use absolute URLs for `og:image`
