---
name: url-to-design-system
description: Reverse-extract a live website's visual language into a standalone, buildable React + Storybook design-system package, ready to feed Claude Design via the /design-sync skill. Use when the user gives a website URL and wants a design system, component library, Storybook, or a /design-sync source built from it — e.g. "make a design system from this site", "turn this URL into a Storybook", "extract the design tokens from <url>".
---

# URL → Design System (Storybook for /design-sync)

Turn a live website URL into a **standalone, buildable React design-system package** whose Storybook is the source of truth for `/design-sync`. The output is a *faithful reconstruction* of the site's visual language — tokens + composable components — **not** a pixel clone and not a scrape of the site's markup.

Reference build (study it before scaffolding): `~/code/design-systems/sasuke-ds`. This skill generalizes exactly what produced it.

## What "good" looks like

A package that satisfies the user's standing DS rules:
- Standalone & buildable: `exports` map + real Vite library build to `dist/` (ESM `.js` + CJS `.cjs` + one compiled `.css` + bundled `index.d.ts`).
- Components render standalone — no app/server/data coupling, no required Provider, self-contained types.
- **Storybook from the start** (`@storybook/react-vite`) — this is the `/design-sync` source.
- Tokens-first: every color/space/font/border is a `--<ns>-*` CSS custom property; components reference tokens, never raw values.
- A primitive-led component tree: find the site's atomic repeated unit, build it once, compose everything else from it.
- `README.md` + `AGENTS.md` written in the same pass (user rule).

## Pipeline

Track these as tasks. Do them in order.

1. **Extract** — capture the site's computed-style vocabulary (`scripts/extract-tokens.mjs` or the Playwright MCP). → see REFERENCE.md "Extraction".
2. **Distill tokens** — collapse the raw distribution into a *small, coherent* token set (a real DS has ~5 colors, 1-2 fonts, one spacing module, 3-5 sizes). Name them. → REFERENCE.md "Token taxonomy".
3. **Identify the primitive(s)** — the 1-3 atomic units the whole page is built from (a framed cell, a card, a pill). Everything composes from these.
4. **Scaffold** — copy `templates/` into the target dir, rename the `--sds-`/`sasuke`/`sds` namespace to this system's, drop in the distilled tokens.
5. **Build components + stories** — primitive first, then composites. One `.tsx` + `.css` + `.stories.tsx` per component. Each story is a real `/design-sync` card.
6. **Showcase story** — one story that reassembles a recognizable slice of the source page from the components (proves the vocabulary is complete).
7. **Verify** — `npm install`, `npm run build` AND `npm run build-storybook` must both pass. Then launch Storybook and screenshot key stories against the source (Playwright) to confirm fidelity.
8. **Docs + memory** — `README.md` (origin, tokens table, component table, fidelity notes, before/after screenshots in `docs/`), `AGENTS.md` (conventions + gotchas), update `~/.claude/.../memory`.

## Quick start

```
# 1. extract (after `npm i -D playwright` somewhere, or use the Playwright MCP)
node ~/.claude/skills/url-to-design-system/scripts/extract-tokens.mjs <url> > /tmp/tokens.json

# 2. scaffold
cp -R ~/.claude/skills/url-to-design-system/templates ~/code/design-systems/<name>-ds
cd ~/code/design-systems/<name>-ds
#   then: rename namespace, fill tokens.css from /tmp/tokens.json, build components

# 3. verify
npm install && npm run build && npm run build-storybook
```

## Decide with the user before scaffolding

- **Target dir & name**: default `~/code/design-systems/<name>-ds`. The `<name>` becomes the CSS namespace `--<name>-*` and package name.
- **Styling**: default **vanilla CSS** (custom properties) — best for literal aesthetic match and zero runtime. Offer Tailwind only if the user asks or the source is plainly utility-grid generic.
- **Scope**: which page/section to model. One coherent page is enough; don't try to cover a whole site in v1.

## Critical gotchas

- **Reconstruct, don't scrape.** Sites like the reference have 15k+ divs (dot grids, canvas shaders). Ignore the DOM bulk — the *design vocabulary* is tiny. Build clean components, not a DOM dump.
- **TS2698 spread error**: spreading a possibly-`undefined` `style` prop trips `tsc` in this config. Always `{ ...(style ?? {}) }` then assign CSS vars via a `Record<string,string>` cast. See REFERENCE.md.
- **Canvas / WebGL / shader effects** can't be extracted as tokens. Approximate them with CSS/SVG and **document the approximation** in README + AGENTS (the reference's `LogoCell` blob is a CSS stand-in for a canvas shader).
- **Fonts**: identify the real family from computed `font-family`; wire it in `src/styles/fonts.css`. Don't assume — read the computed value.
- **Licensed/proprietary fonts** (Söhne, GT, Klim faces, brand-custom): these are **not on Google Fonts** and can't be freely embedded. Name the real face first in the token stack (licensed consumers get it), then fall back to the closest **free** substitute and load *that* (e.g. Söhne Mono → IBM Plex Mono; Söhne → Inter). Document the substitution in README + AGENTS. The `fonts.css` template's Google-Fonts `@import` only works for free families — don't point it at a licensed name.

See [REFERENCE.md](REFERENCE.md) for the extraction recipe, token taxonomy, the scaffold file-by-file, and the /design-sync handoff.
