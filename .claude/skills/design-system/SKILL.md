---
name: design-system
description: Use when building, changing, or reviewing any UI in this repo — pages, screens, layouts, components, styling, colors, typography, spacing, dark mode, accessibility, or "make it look like X". Establishes @elirobinson/react, @elirobinson/tokens, and @elirobinson/ai-patterns as the primary source of components, tokens, design patterns, and UI contracts, and shows how to discover what the installed versions offer.
---

# Design System First

All UI in this repo is built from **`@elirobinson/react`** (components, hooks), **`@elirobinson/tokens`** (color, type, space, radius, shadow, motion), and **`@elirobinson/ai-patterns`** (the contracts and patterns you build under). Never a second component library. Never hardcoded design values.

Full guide: `docs/design-system.md`. Upstream Storybook/docs: https://github.com/EliRobinson/design-system

## Step 1 — Ask the packages, don't guess

Run these **before** writing UI. They read `node_modules` at run time, so they match the installed versions exactly — including the component directory layout, which is discovered rather than assumed:

```bash
pnpm ds                 # components (+ exports & variants), hooks, typography classes, token groups
pnpm ds props <Name>    # props and variant unions; accepts `Card` or `molecules/Card`
pnpm ds tokens [filter] # tokens and their values
pnpm ds classes [filter]# CSS classes the design system ships
pnpm ds contracts       # machine-checkable rules your UI must satisfy — read this every time
pnpm ds patterns        # working principles (ask-then-act, explain decisions, safe defaults)
pnpm ds prompts [name]  # reusable prompt templates: add-component, audit-page, adopt-system
```

Any component list you remember, or that appears in a doc, may be out of date. `pnpm ds` is the authority. For deeper detail read `node_modules/@elirobinson/react/src/components/<tier>/<Name>.tsx` and `node_modules/@elirobinson/tokens/src/tokens.css`.

## Step 2 — Compose

```tsx
import { Button } from '@elirobinson/react/components/atoms/Button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@elirobinson/react/components/molecules/Card'
```

- Per-component imports naming the full subpath; there is no barrel export, and a bare `@elirobinson/react` import does not resolve. Components sit under `atoms` / `molecules` / `organisms` — `pnpm ds` prints each one's subpath.
- Drive appearance with the component's own `variant` / `size` props, not by overriding with utilities.
- Use Tailwind utilities for **layout** (grid, flex, spacing), the design system for **look**.
- Stylesheets are imported once in `src/app/layout.tsx` — never re-import per component.
- Patterns like heroes, page headers, empty states, and sidebars are **compositions** of primitives, not missing components.

## Step 3 — Use tokens, never literals

In order of preference:

1. Token-backed Tailwind utilities: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-surface`, `border-border`, `text-accent`, `bg-destructive`, `ring-ring`. These alias design system tokens via `src/app/globals.css`.
2. Typography classes: `t-display-1`, `t-h1`…`t-h5`, `t-lead`, `t-body`, `t-body-sm`, `t-caption`, `t-eyebrow`, `t-code`, `t-mono` (confirm with `pnpm ds`).
3. Arbitrary values referencing a token: `text-[var(--fg-2)]`, `gap-[var(--space-6)]`, `shadow-[var(--shadow-md)]`, `duration-[var(--dur-fast)]`.

**Forbidden:** hex/`rgb()`/`oklch()` literals, magic px for radius/shadow/motion, ad-hoc font-size stacks where a `.t-*` class exists.

Dark mode is `[data-theme="dark"]`, not `.dark`. Token-driven UI inverts for free.

## Step 4 — Satisfy the contracts

`pnpm ds contracts` prints `@elirobinson/ai-patterns`' rules as data. They are requirements, and each ships its own `check` so you can verify rather than assume. As of writing they cover:

- **uiContracts** — minimum touch target, visible focus required, WCAG AA contrast.
- **componentConstraints** — subpath-only imports, `forwardRef` on interactive components, 44×44 targets for primary controls, shadcn/MUI-scale sizing for dense affordances, no overlapping hit areas, and the atom/molecule/organism tier boundary.
- **systemPromptStyle** — the voice for user-facing copy you write: practical, honest, warm; no hype or jargon-first language; always a clear next step and an accessibility consideration.

Read them from the command, not from this list — the package is the authority and this summary can age.

## Step 5 — When something is missing

Stop at the first rung that works:

1. Compose it from existing primitives.
2. `pnpm dlx shadcn@latest add <component>` into `src/components/ui/`, then restyle with tokens. Gap-filler only.
3. Hand-roll from tokens — last resort, and say so in your summary as a **design system gap** worth upstreaming.

Foreign UI libraries (MUI, Chakra, Ant Design, Mantine, HeroUI, Headless UI, DaisyUI), direct Radix imports outside `src/components/ui/`, and bare `@elirobinson/*` imports are blocked by ESLint. Do not work around the ban — pick a rung above.

Contributing a component upstream instead? `pnpm ds prompts add-component` prints a fill-in-the-blanks template for exactly that.

## Before you call UI work done

- [ ] Ran `pnpm ds` and reused what exists.
- [ ] Ran `pnpm ds contracts`; every `componentConstraints` check holds.
- [ ] Imports name a subpath (`components/<tier>/<Name>`) — no bare package imports.
- [ ] No component library other than `@elirobinson/react` (shadcn only as documented gap-filler).
- [ ] Zero hardcoded colors, radii, shadows, durations, font sizes.
- [ ] Typography uses `.t-*` classes or token-backed utilities.
- [ ] Interactive controls meet the touch-target and visible-focus contracts.
- [ ] Works under `data-theme="dark"`.
- [ ] `pnpm lint` and `pnpm type-check` pass.
- [ ] Any design system gap called out explicitly.
