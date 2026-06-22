# General Principles

- Don't assume. Don't hide confusion. Surface tradeoffs.
- Minimum code that solves problems. Nothing speculative.
- Touch only what you must. Clean up only your own mess.
- Define success criteria. Loop until verified.

# Global Preferences

- Keep explanations concise.

# Engineering Preferences

- To get a quick understanding of a repo, look at `CODEBASE.md` for a summary if it exists. If you already have enough context, can skip.
- If deploying to Vercel, always ensure a favicon exists and `README.md` is updated.
- Always test code before deployment.
- If creating frontend from scratch for a new project, always use /ui-ux-pro-max and /frontend-design skill. On the landing page, use framer-motion for animations where possible.
- Design systems: establish foundations up front (tokens, fonts, 2-3 primitives); extract a component into the DS on its ~2nd-3rd reuse, not speculatively. Keep the DS as a standalone, buildable package (e.g. `packages/ds`): `exports` + a real library build to `dist/` (tsup/rollup/vite) + **compiled** CSS, with components that render standalone (no app/server/data coupling, self-contained types, at most one named Provider). This keeps the repo `/design-sync`-ready. Default to a monorepo package the app imports; give the DS its own repo + npm publish only once a second app/team consumes it. For a serious/lasting product, scaffold **Storybook with the DS from the start** — it's cheapest to adopt at zero components, forces standalone-renderable components, and is the preferred `/design-sync` source (richer, auto-verified previews); skip it only for prototypes/throwaways. It's a commitment decision made once up front, not a milestone to grow into.
- If a project uses Supabase, read and follow `~/.claude/SUPABASE.md` for security rules.

# Hygiene

- When creating tmp folders/files, ensure to always tidy them up (i.e. delete) before task completion.
