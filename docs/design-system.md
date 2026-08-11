# Design System Wiring

**How to build UI is not documented here.** It ships with the packages, versioned alongside the code it describes:

```bash
pnpm ds                  # components (+ exports & variants), hooks, typography classes, token groups
pnpm ds props <Name>     # props, variant unions, and the exact import line to copy
pnpm ds tokens [filter]  # tokens and their values
pnpm ds classes [filter] # CSS classes the design system ships
pnpm ds contracts        # the rules UI must satisfy, and what verifies each
pnpm ds patterns         # working principles, and the definition of done for UI work
pnpm ds prompts [name]   # reusable prompt templates
```

The rules an agent should load first are in [AGENTS.md → UI: design system first](../AGENTS.md#ui-design-system-first), which `pnpm ds init --agents` maintains. Upstream Storybook and full docs: [EliRobinson/design-system](https://github.com/EliRobinson/design-system).

This file covers only the four places the design system touches this repo.

---

## 1. Stylesheets — `src/app/layout.tsx`

```tsx
import '@elirobinson/tokens/tokens.css'
import '@elirobinson/react/styles.css'
import './globals.css'
```

Imported once, in that order. Never re-import them per component.

## 2. Tailwind bridge — `src/app/globals.css`

```css
@import 'tailwindcss';
@import '@elirobinson/tokens/tailwind.css';
```

`tailwind.css` maps Tailwind's theme namespaces onto the tokens. **Without it, `bg-background` and `text-muted-foreground` resolve to nothing at all** — no error, no color. Don't hand-roll the mapping: the shadcn/ui variable contract collides with these token names, so the obvious `--accent: var(--accent)` alias is circular and silently yields nothing.

A new token upstream needs no edit here. The only local additions are the font families, repointed at the `next/font` faces — next/font loads Geist under a generated family name, so the token's literal `'Geist'` would never match.

## 3. Lint — `eslint.config.mjs`

```js
import designSystem from '@elirobinson/eslint-config'

export default [
  // …existing config
  ...designSystem({ gapFiller: ['src/components/ui/**'] })
]
```

That is the statically checkable half of `pnpm ds contracts`: foreign UI libraries, direct Radix imports, bare `@elirobinson/*` imports, and hardcoded design values (hex / `rgb()` / `oklch()`, and magic px for radius, shadow and duration) in `className` strings, `cn()` calls, and `style` objects.

`gapFiller` names this repo's sanctioned shadcn/ui output — the one place direct primitive imports are allowed. Everything else still applies there.

## 4. Contract checks — `e2e/design-system.spec.ts`

The half a linter can't settle — touch targets, visible focus, WCAG AA contrast — runs in a real browser:

```ts
import { expectDesignSystemContracts } from '@elirobinson/ai-patterns/testing/playwright'

await page.goto('/')
await expectDesignSystemContracts(page)
```

Needs `axe-core` alongside Playwright (a devDependency here). The spec runs the checks in both themes; extend it with a case per route as the app grows.

The file is `.mts`, not `.ts`: the helper is ESM-only, and Playwright compiles a plain `.ts` spec to CJS, where the subpath doesn't resolve.

---

## Dark mode

The tokens theme on `[data-theme="dark"]` (`.dark` is accepted as a fallback). Nothing is wired up in this template — there is no theme switcher. If you add `next-themes`, mount it with `attribute="data-theme"`: its default is `attribute="class"`, which toggles a class every component's CSS is written against `data-theme` instead, so dark mode silently does nothing.

## When the design system doesn't cover something

Stop at the first rung that works:

1. **Compose it** from existing primitives. Most "missing" components (page headers, heroes, empty states, sidebars) are compositions — Storybook documents these under **Patterns**.
2. **shadcn/ui**, only for a genuinely uncovered primitive: `pnpm dlx shadcn@latest add <component>`. It lands in `src/components/ui/` as owned code. Restyle it with tokens, and delete it if the design system later ships an equivalent.
3. **Hand-roll it** from tokens — last resort. Flag it in your summary as a **design system gap**: if it's reusable, it belongs [upstream](https://github.com/EliRobinson/design-system), not permanently here.

`pnpm ds prompts add-component` prints a brief for the upstream contribution.

## Keeping current

```bash
pnpm exec ds-resync   # what's out of date, and what changed while you were away
```

Then bump and refresh the agent files:

```bash
pnpm add @elirobinson/tokens@latest @elirobinson/react@latest
pnpm add -D @elirobinson/ai-patterns@latest @elirobinson/eslint-config@latest
pnpm ds init --agents --force
```

That is the whole maintenance story — no doc edits, even when the packages reorganise themselves, because `pnpm ds` discovers the layout rather than assuming it. Install requires GitHub Packages auth: see [AGENTS.md → Environment Variables](../AGENTS.md#environment-variables).
