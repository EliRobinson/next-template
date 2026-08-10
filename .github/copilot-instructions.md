# Copilot instructions

Next.js 15 (App Router) + TypeScript strict + Tailwind CSS v4 + pnpm. Full conventions live in [`AGENTS.md`](../AGENTS.md); read it for anything not covered here.

## UI: design system first

All UI is built from **`@elirobinson/react`** (components, hooks) and **`@elirobinson/tokens`** (color, type, space, radius, shadow, motion). These are the primary source of components, tokens, and design patterns — see [`docs/design-system.md`](../docs/design-system.md) and the upstream [design system](https://github.com/EliRobinson/design-system).

- Discover what exists with `pnpm ds` (also `pnpm ds props <Name>`, `pnpm ds tokens [filter]`, `pnpm ds classes`). It reads `node_modules` at run time, so it is never stale — do not trust a component list from memory or from a doc.
- Import per component: `import { Button } from '@elirobinson/react/components/Button'`. There is no barrel export.
- Style with the component's own `variant` / `size` props; use Tailwind utilities for layout only.
- Colors, radii, shadows, durations, and font sizes come from tokens: token-backed utilities (`bg-background`, `text-muted-foreground`, `border-border`, `text-accent`), `.t-*` typography classes, or `var(--token)` in arbitrary values. Never hardcode a literal.
- Dark mode is `[data-theme="dark"]`, not `.dark`.
- Missing a piece? Compose it from primitives → then shadcn/ui into `src/components/ui/` → then hand-roll from tokens and flag it as a design system gap.
- Other component libraries (MUI, Chakra, Ant Design, Mantine, HeroUI, Headless UI, DaisyUI) and direct Radix imports outside `src/components/ui/` are blocked by ESLint.

## Everything else

- Default to Server Components; add `"use client"` only for hooks or browser APIs.
- TypeScript strict, `@/*` → `src/*`, type-only imports via `import type`.
- StandardJS style enforced by ESLint + Prettier — single quotes, no semicolons, no hand-sorted Tailwind classes.
- Conventional Commits (`feat:`, `fix:`, `docs:`…); subject casing is not enforced.
- Tests: Vitest + RTL in `tests/unit/`, Playwright in `e2e/`.
- Quality gates: `pnpm type-check`, `pnpm lint`, `pnpm format:check`, `pnpm test`.
- No `console.log` (`console.warn`/`console.error` only), no `any` without a justifying eslint-disable comment.
