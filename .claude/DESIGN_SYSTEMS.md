# Design Systems

Guidance for building or extending a design system (DS). Read this when a task involves creating, extracting into, or maintaining a DS.

## When to build

- Establish foundations up front: tokens, fonts, 2–3 primitives.
- Extract a component into the DS on its ~2nd–3rd reuse, not speculatively.
- It's a commitment decision made once up front, not a milestone to grow into.

## Package shape

- Keep the DS as a standalone, buildable package (e.g. `packages/ds`):
  - `exports` + a real library build to `dist/` (tsup/rollup/vite) + **compiled** CSS.
  - Components render standalone: no app/server/data coupling, self-contained types, at most one named Provider.
- This keeps the repo `/design-sync`-ready.

## Where it lives

- Default to a monorepo package the app imports.
- Give the DS its own repo + npm publish only once a second app/team consumes it.

## Storybook

- For a serious/lasting product, scaffold **Storybook with the DS from the start** — it's cheapest to adopt at zero components, forces standalone-renderable components, and is the preferred `/design-sync` source (richer, auto-verified previews).
- Skip it only for prototypes/throwaways.
