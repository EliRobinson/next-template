---
name: design-system
description: Use when building, changing, or reviewing any UI in this repo — pages, screens, layouts, components, styling, colors, typography, spacing, dark mode, or "make it look like X". Establishes @elirobinson/react and @elirobinson/tokens as the primary source of components, tokens, and design patterns, and shows how to discover what the installed version offers.
---

# Design System First

All UI in this repo is built from **`@elirobinson/react`** (components, hooks) and **`@elirobinson/tokens`** (color, type, space, radius, shadow, motion). Never a second component library. Never hardcoded design values.

Full guide: `docs/design-system.md`. Upstream Storybook/docs: https://github.com/EliRobinson/design-system

## Step 1 — Ask the package, don't guess

Run this **before** writing UI. It reads `node_modules` at run time, so it matches the installed version exactly:

```bash
pnpm ds                 # components (+ exports & variants), hooks, typography classes, token groups
pnpm ds props <Name>    # exact props and variant unions for one component
pnpm ds tokens [filter] # tokens and their values
pnpm ds classes [filter]# CSS classes the design system ships
```

Any component list you remember, or that appears in a doc, may be out of date. `pnpm ds` is the authority. For deeper detail read `node_modules/@elirobinson/react/src/components/<Name>.tsx` and `node_modules/@elirobinson/tokens/src/tokens.css`.

## Step 2 — Compose

```tsx
import { Button } from '@elirobinson/react/components/Button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@elirobinson/react/components/Card'
```

- Per-component imports; there is no barrel export.
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

## Step 4 — When something is missing

Stop at the first rung that works:

1. Compose it from existing primitives.
2. `pnpm dlx shadcn@latest add <component>` into `src/components/ui/`, then restyle with tokens. Gap-filler only.
3. Hand-roll from tokens — last resort, and say so in your summary as a **design system gap** worth upstreaming.

Foreign UI libraries (MUI, Chakra, Ant Design, Mantine, HeroUI, Headless UI, DaisyUI) and direct Radix imports outside `src/components/ui/` are blocked by ESLint. Do not work around the ban — pick a rung above.

## Before you call UI work done

- [ ] Ran `pnpm ds` and reused what exists.
- [ ] No component library other than `@elirobinson/react` (shadcn only as documented gap-filler).
- [ ] Zero hardcoded colors, radii, shadows, durations, font sizes.
- [ ] Typography uses `.t-*` classes or token-backed utilities.
- [ ] Works under `data-theme="dark"`.
- [ ] `pnpm lint` and `pnpm type-check` pass.
- [ ] Any design system gap called out explicitly.
