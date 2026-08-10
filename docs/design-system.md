# Design System Guide

**`@elirobinson/react` + `@elirobinson/tokens` are the primary source of components, tokens, and design patterns for anything built on this template.** Read this before writing a single line of UI.

Upstream source of truth (Storybook, full docs, contribution guide): [EliRobinson/design-system](https://github.com/EliRobinson/design-system).

---

## The rule

Every UI surface — a new marketing site, an app screen, one added component — is composed from the design system first. Concretely:

| Need                                       | Where it comes from                                               |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Components                                 | `@elirobinson/react/components/<Name>`                            |
| Hooks                                      | `@elirobinson/react/hooks/<name>`                                 |
| Color, type, space, radius, shadow, motion | `@elirobinson/tokens` (CSS custom properties)                     |
| Typography                                 | The `.t-*` classes shipped with the tokens                        |
| Layout patterns                            | Composed from design system primitives (see Storybook → Patterns) |

Never introduce a second UI vocabulary. MUI, Chakra, Ant Design, Mantine, HeroUI, Headless UI, DaisyUI and direct Radix imports are blocked by ESLint (`no-restricted-imports` in [`eslint.config.mjs`](../eslint.config.mjs)) — that block is a backstop, not the reason.

---

## Discover what exists — never guess, never trust a list

The inventory lives in the installed package, not in this file. Documentation drifts; the package does not.

```bash
pnpm ds                 # components (with exports + variants), hooks, typography classes, token groups
pnpm ds props Button    # exact props and variant unions for one component
pnpm ds tokens          # every design token and its value
pnpm ds tokens accent   # filter tokens by name or value
pnpm ds classes         # every CSS class the design system ships
```

`pnpm ds` reads `node_modules/@elirobinson/*` at run time, so its output always matches the installed version. **Run it at the start of any UI task.**

If you need more than the CLI gives you, read the package directly — it ships both types and source:

```
node_modules/@elirobinson/react/dist/components/<Name>.d.ts   # props, variants
node_modules/@elirobinson/react/src/components/<Name>.tsx     # implementation
node_modules/@elirobinson/react/src/styles.css                # component CSS
node_modules/@elirobinson/tokens/src/tokens.css               # all tokens + dark theme
node_modules/@elirobinson/tokens/src/tokens.json              # tokens as data
```

---

## Using components

```tsx
import { Button } from '@elirobinson/react/components/Button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@elirobinson/react/components/Card'
```

- Import per-component; there is no barrel export.
- Stylesheets (`@elirobinson/tokens/tokens.css`, `@elirobinson/react/styles.css`) are imported once in [`src/app/layout.tsx`](../src/app/layout.tsx). Never re-import them per component.
- Use a component's own `variant` / `size` props instead of overriding its look with utility classes. `pnpm ds props <Name>` lists them.
- Most components are unstyled-by-default containers plus a `className` passthrough — use `cn()` from `@/lib/utils` for conditional classes, and reserve utilities for layout (grid, flex, spacing) rather than repainting the component.

## Using tokens

Tokens are CSS custom properties on `:root`, and the Tailwind color layer in [`src/app/globals.css`](../src/app/globals.css) is a thin alias over them. Three ways to reach a token, in order of preference:

1. **Tailwind utilities** — `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-surface`, `border-border`, `text-accent`, `bg-destructive`, `ring-ring`. These resolve to design system tokens, so brand changes land automatically.
2. **Typography classes** — `t-display-1`, `t-h1`…`t-h5`, `t-lead`, `t-body`, `t-body-sm`, `t-caption`, `t-eyebrow`, `t-code`, `t-mono`. Prefer these over hand-assembled `text-*`/`font-*`/`tracking-*` stacks; run `pnpm ds` for the current set.
3. **Arbitrary values** referencing a token — `text-[var(--fg-2)]`, `gap-[var(--space-6)]`, `shadow-[var(--shadow-md)]`, `duration-[var(--dur-fast)]`.

**Never hardcode a design value.** No hex codes, no `oklch()`/`rgb()` literals, no magic px for radius, shadow, or motion. If a value seems missing, it is either named differently (`pnpm ds tokens <guess>`) or belongs upstream in the design system.

### Dark mode

The tokens ship a dark theme under `[data-theme="dark"]`. Everything token-driven inverts for free. If you add `next-themes`, mount it with `attribute="data-theme"` — the default `class` strategy will not trigger the design system's dark theme.

---

## When the design system doesn't cover something

Work down this ladder, and stop at the first rung that works:

1. **Compose it** from existing primitives. Most "missing" components (page headers, heroes, empty states, stat rows, sidebars) are compositions, not new primitives. Storybook documents these under **Patterns**.
2. **shadcn/ui**, only for a genuinely uncovered primitive: `pnpm dlx shadcn@latest add <component>`. It lands in `src/components/ui/` as owned code. Restyle it with design system tokens so it doesn't look foreign, and delete it if the design system later ships an equivalent.
3. **Hand-roll it** — last resort. Build it from tokens, keep it in `src/components/`, and flag it in your summary as a **design system gap**: if it is reusable, it belongs upstream in [EliRobinson/design-system](https://github.com/EliRobinson/design-system), not permanently here.

Never reach for another component library. That is what the ESLint ban enforces.

---

## Keeping current

Bumping the version is the only maintenance this template needs — no doc edits, no inventory updates:

```bash
export NODE_AUTH_TOKEN=<github-pat-with-read:packages>
pnpm add @elirobinson/tokens@latest @elirobinson/react@latest
pnpm ds          # confirm what the new version adds
```

New components, tokens and typography classes show up in `pnpm ds` immediately, and new token values flow through the Tailwind aliases in `globals.css` without changes. Install requires GitHub Packages auth — see [AGENTS.md → Environment Variables](../AGENTS.md#environment-variables).

---

## Definition of done for UI work

- [ ] Ran `pnpm ds` and used existing components/hooks wherever they fit.
- [ ] No component library other than `@elirobinson/react` (shadcn only as a documented gap-filler).
- [ ] No hardcoded colors, radii, shadows, durations, or font sizes — tokens only.
- [ ] Typography uses `.t-*` classes or token-driven utilities.
- [ ] Renders correctly with `data-theme="dark"` on `<html>`.
- [ ] Any gap in the design system is called out explicitly for upstreaming.
