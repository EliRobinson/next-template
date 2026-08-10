# Agent & AI Collaboration Guide

This file is the single source of truth for AI agents and humans working in this codebase. `CLAUDE.md` is a symlink to this file.

---

## Read this first: design system is the default

**All UI in this project is built from the [design system](https://github.com/EliRobinson/design-system): `@elirobinson/react` (components, hooks), `@elirobinson/tokens` (color, type, space, radius, shadow, motion), and `@elirobinson/ai-patterns` (the contracts and working patterns agents must follow).** Nothing comes from another component library, and nothing is a hardcoded design value.

Before writing or changing any UI, run:

```bash
pnpm ds            # live inventory: components, hooks, typography classes, tokens
pnpm ds contracts  # machine-checkable rules your UI has to satisfy
```

Both read the installed packages, so they are always accurate for the versions in use — including the component directory layout, which is discovered rather than assumed. **Never rely on a component list written in a doc — including this one.** Full rules, discovery commands, and the escalation path when something is missing: **[docs/design-system.md](docs/design-system.md)**.

---

## Project Overview

A production-ready **Next.js 15** starter template. Built with the App Router, TypeScript strict mode, Tailwind CSS v4, the [`@elirobinson/react`](https://github.com/EliRobinson/design-system) design system, TanStack data libraries, an optional Drizzle/Postgres database layer, and a full quality-gate toolchain.

---

## Tech Stack

| Layer                  | Choice                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Framework              | Next.js 15 (App Router, Turbopack)                                                                 |
| Language               | TypeScript 5 (strict, `@/*` path alias → `src/*`)                                                  |
| Components & styling   | `@elirobinson/react` + `@elirobinson/tokens` (primary) on Tailwind CSS v4; shadcn/ui as gap-filler |
| UI contracts for AI    | `@elirobinson/ai-patterns` (`pnpm ds contracts`, `patterns`, `prompts`)                            |
| Data fetching          | TanStack Query v5                                                                                  |
| Tables                 | TanStack Table v8                                                                                  |
| Forms                  | TanStack Form                                                                                      |
| Virtualization         | TanStack Virtual                                                                                   |
| Env validation         | `@t3-oss/env-nextjs` + Zod (`src/env.ts`)                                                          |
| Database (optional)    | Drizzle ORM + Postgres (`src/server/db/`)                                                          |
| Unit/integration tests | Vitest + React Testing Library                                                                     |
| E2E / functional tests | Playwright                                                                                         |
| Package manager        | pnpm                                                                                               |
| Linting                | ESLint (Next.js flat config + `neostandard`, StandardJS style)                                     |
| Formatting             | Prettier (`prettier-config-standard` + `prettier-plugin-tailwindcss`)                              |
| Commits                | Commitizen + Commitlint (Conventional Commits)                                                     |
| Dependency updates     | Renovate (auto-merge patch/minor + security)                                                       |

---

## Directory Structure

```
src/
  app/           # Next.js App Router pages and layouts
  components/
    ui/          # shadcn/ui components (added via CLI)
    providers.tsx # TanStack Query provider + devtools
  hooks/         # Custom React hooks
  lib/
    utils.ts     # cn() and shared utilities
  server/
    actions/     # Server actions (Zod-validated input)
    db/          # Drizzle schema + connection (optional — delete if unused)
  types/         # Shared TypeScript types
  env.ts         # Validated environment variables (@t3-oss/env-nextjs + Zod)
tests/
  unit/          # Vitest + RTL unit & integration tests
e2e/             # Playwright end-to-end tests
docs/
  design-system.md # How to build UI from @elirobinson/react + tokens
scripts/
  design-system.mjs # `pnpm ds` — live inventory read from node_modules
```

---

## Development Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm ds           # Design system inventory (run before any UI work)
pnpm ds props X   # Props + variants for design system component X
pnpm ds tokens    # Every design token and its value
pnpm ds contracts # Machine-checkable UI rules from @elirobinson/ai-patterns
pnpm ds prompts   # Reusable prompt templates (add-component, audit-page, …)
pnpm build        # Production build
pnpm lint         # ESLint check
pnpm lint:fix     # ESLint auto-fix
pnpm format       # Prettier write
pnpm type-check   # tsc --noEmit
pnpm test         # Vitest (unit)
pnpm test:e2e     # Playwright (E2E)
pnpm commit       # Commitizen interactive commit
pnpm db:generate  # Generate a Drizzle migration from schema changes
pnpm db:migrate   # Apply pending Drizzle migrations
pnpm db:studio    # Open Drizzle Studio
```

---

## Coding Conventions

### TypeScript

- Strict mode is on — no implicit `any`, no unchecked nulls.
- Use type imports: `import type { Foo } from "./foo"`.
- Prefer `interface` for object shapes that may be extended; `type` for unions/intersections.
- Path alias `@/` maps to `src/`.

### React & Next.js

- Default to **Server Components**. Add `"use client"` only when browser APIs or hooks are required.
- Co-locate data-fetching with the server component that needs it.
- Keep Client Components as leaf nodes. Lift them out only when the boundary needs to move.
- Use `next/image` and `next/link` instead of `<img>` and `<a>`.

### Styling & Components

Full guide: **[docs/design-system.md](docs/design-system.md)**. The short version:

**Component sourcing priority — always in this order:**

1. **`@elirobinson/react`** (the design system) — run `pnpm ds` to see what exists, then import the subpath it prints: `@elirobinson/react/components/<tier>/<Name>`, `@elirobinson/react/hooks/<name>`. There is no barrel export; a bare package import does not resolve.
2. **Compose from design system primitives** — most "missing" pieces (heroes, page headers, empty states, sidebars) are compositions, not new primitives.
3. **shadcn/ui** — only for a primitive the design system genuinely doesn't cover. Add via `pnpm dlx shadcn@latest add <component>` into `src/components/ui/`, never manually. Restyle it with design system tokens.
4. **Hand-rolled component** — last resort. Build it from tokens and flag it as a design system gap; it probably belongs upstream.

Never reach for an unrelated external component library (MUI, Chakra, Ant Design, Mantine, Headless UI, Radix directly, etc.) — the design system already wraps the primitives this template needs. ESLint blocks these imports.

- **Discover, don't guess.** `pnpm ds`, `pnpm ds props <Name>`, `pnpm ds tokens [filter]`, `pnpm ds classes [filter]` all read the installed package. Component `.d.ts` and `.tsx` sources are in `node_modules/@elirobinson/react/`.
- **Honor the contracts.** `pnpm ds contracts` prints the `componentConstraints` and `uiContracts` from `@elirobinson/ai-patterns` — touch targets, visible focus, WCAG AA contrast, ref forwarding, subpath imports. They are requirements, and each carries its own `check`.
- **Tokens over literals.** No hex/`oklch()` colors, no magic px for radius, shadow, or motion. Use token-backed Tailwind utilities (`bg-background`, `text-muted-foreground`, `border-border`, `text-accent`), the `.t-*` typography classes, or `var(--token)` in arbitrary values.
- The Tailwind color layer in `src/app/globals.css` is a thin alias over `@elirobinson/tokens` — extend it by aliasing more tokens, never by hardcoding values.
- Dark mode is `[data-theme="dark"]` (design system convention), not `.dark`. Configure `next-themes` with `attribute="data-theme"` if you add it.
- `@elirobinson/tokens/tokens.css` and `@elirobinson/react/styles.css` are imported once in `src/app/layout.tsx`; don't re-import them per component.
- Use Tailwind utilities for layout/spacing on JSX. Avoid custom CSS files except the token aliases in `globals.css`.
- Use `cn()` (from `@/lib/utils`) to merge conditional classes.
- Class order is enforced by `prettier-plugin-tailwindcss` — don't hand-sort.
- Installing/updating the design system requires GitHub Packages auth — see [Environment Variables](#environment-variables).

### TanStack Query

- Wrap queries in custom hooks inside `src/hooks/` (e.g. `useUsers.ts`).
- Export query key factories alongside hooks for cache invalidation.
- Use `suspense: true` + `<Suspense>` boundaries for loading states when possible.

### Error Handling

- Validate external input at system boundaries only (API routes, form submissions).
- Use Next.js `error.tsx` files for route-level error boundaries.
- Do not add defensive try/catch for code that cannot throw.

### Comments

- Write no comments by default. Only add one when the WHY is non-obvious: a hidden constraint, a workaround, or a subtle invariant.
- Do not comment what the code does — well-named identifiers handle that.

---

## Commit Standards

This project enforces **Conventional Commits**. All commits must match:

```
<type>(<optional scope>): <subject>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Use `pnpm commit` for the interactive Commitizen prompt. Direct `git commit` will be validated by the `commit-msg` Husky hook.

**Breaking changes:** add `!` after the type (`feat!:`) and a `BREAKING CHANGE:` footer.

---

## Testing Strategy

### Unit / integration (Vitest + RTL)

- Test files live in `tests/unit/` with the pattern `*.test.tsx`.
- Test user-visible behavior, not implementation details.
- Use `userEvent` over `fireEvent` for user interactions.
- Mock only at external boundaries (network, browser APIs). Do not mock internal modules.
- Coverage threshold: 70% branches/functions/lines.

### E2E (Playwright)

- Test files live in `e2e/` with the pattern `*.spec.ts`.
- Test critical user paths end-to-end against a running dev server.
- Use `page.getByRole()` and `page.getByText()` selectors (accessibility-first).
- Avoid `page.locator("css selector")` unless no semantic alternative exists.

---

## Design System

Three packages, one source of truth for everything visual and for how agents build it. **Full guide: [docs/design-system.md](docs/design-system.md).** Upstream Storybook and docs: [EliRobinson/design-system](https://github.com/EliRobinson/design-system).

| Package                    | Provides                                                   | Dependency type |
| -------------------------- | ---------------------------------------------------------- | --------------- |
| `@elirobinson/react`       | Components (`atoms`/`molecules`/`organisms`) and hooks     | dependency      |
| `@elirobinson/tokens`      | Color, type, space, radius, shadow, motion, `.t-*` classes | dependency      |
| `@elirobinson/ai-patterns` | UI contracts, working patterns, reusable prompt templates  | devDependency   |

```tsx
import { Button } from '@elirobinson/react/components/atoms/Button'
import { Card, CardHeader } from '@elirobinson/react/components/molecules/Card'
```

**This file deliberately does not list the components.** Inventories in docs go stale the moment the design system ships a release; the installed package never does. Ask it instead:

```bash
pnpm ds                 # components (+ exports & variants), hooks, typography classes, token groups
pnpm ds props Dialog    # props and variant unions; accepts `Dialog` or `organisms/Dialog`
pnpm ds tokens accent   # tokens filtered by name or value
pnpm ds classes         # every CSS class the design system ships
pnpm ds contracts       # uiContracts + componentConstraints you must satisfy
pnpm ds patterns        # AI product patterns (how to work, not what to import)
pnpm ds prompts         # prompt templates: add-component, audit-page, adopt-system
```

Layout patterns (header, footer, hero, sidebar, top bar) are documented upstream in Storybook under **Patterns** — compose them from primitives rather than expecting fixed layout components.

Updating is the only maintenance this template needs — no doc edits, even when the package reorganises itself (`pnpm ds` discovers the layout):

```bash
pnpm add @elirobinson/tokens@latest @elirobinson/react@latest
pnpm add -D @elirobinson/ai-patterns@latest
pnpm ds
```

Requires `NODE_AUTH_TOKEN` — see [Environment Variables](#environment-variables). New tokens flow into the Tailwind aliases in `src/app/globals.css` automatically.

### Adding shadcn Components (fallback only)

Only reach for shadcn when the design system genuinely doesn't cover the primitive you need:

```bash
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add form table
```

Components are added to `src/components/ui/` and can be customized freely. Never overwrite them with re-installs — treat them as owned code once added. If a shadcn component duplicates something the design system later ships, migrate to the design system version and delete the shadcn one.

---

## Git Hooks (Husky)

The `pre-commit` hook runs `lint-staged`:

- `*.{ts,tsx,js,jsx}` → ESLint fix + Prettier
- `*.{json,css,md,yml}` → Prettier

The `commit-msg` hook runs `commitlint` to enforce Conventional Commits.

The `pre-push` hook mirrors the fast CI jobs (`pnpm type-check`, `pnpm lint`, `pnpm format:check`, `pnpm test`) so a push that would fail CI fails locally first, before consuming a CI run. It intentionally skips the `build` and `test:e2e` steps from the `e2e` CI job — those are slower and still run on the PR itself.

To skip hooks in an emergency: `git commit --no-verify` / `git push --no-verify` (discouraged — fix the underlying issue instead).

---

## Renovate Bot

Renovate runs automatically and:

- **Auto-merges** patch updates to production deps and minor+patch updates to devDependencies (when CI passes).
- **Auto-merges** security vulnerability fixes.
- **Requires manual review** for all major version bumps.
- Groups TanStack, Testing Library, and TypeScript ESLint updates together.
- Pins GitHub Actions to digests.

---

## Environment Variables

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local` or any file containing secrets.

All env vars are declared and validated in `src/env.ts` (via `@t3-oss/env-nextjs` + Zod) — add new vars there, not just to `.env.example`. The build fails fast if a required var is missing or invalid, rather than failing at runtime in production. Prefix client-side variables with `NEXT_PUBLIC_` and list them in the `client` block of `src/env.ts`.

Installing or updating any `@elirobinson/*` package (`tokens`, `react`, `ai-patterns`) requires a GitHub PAT with `read:packages`, set as `NODE_AUTH_TOKEN` (`.npmrc` at the repo root points the `@elirobinson` scope at the GitHub Packages registry). It's an install-time credential, not an app runtime var, so it's kept in `.env.local` rather than declared in `src/env.ts`/Zod. **`.env.local` isn't auto-loaded by pnpm/npm** — export it into your shell before installing:

```bash
export $(grep -v '^#' .env.local | xargs)
pnpm install
```

CI reads the equivalent value from the `NODE_AUTH_TOKEN` repository secret (wired into each job in `.github/workflows/ci.yml`), not from this file.

## Database (optional)

`src/server/db/` (Drizzle ORM + Postgres) and `src/server/actions/` (server actions) are scaffolding for projects that need a database — not required by default. `DATABASE_URL` is optional in `src/env.ts`, but importing `@/server/db` or running `db:*` scripts requires it and fails with a clear error if missing (never connects with an empty URL). If a project doesn't need a database, delete `src/server/db/`, `drizzle.config.ts`, `DATABASE_URL` from `src/env.ts`, the `db:*` scripts, and `drizzle-orm`/`postgres`/`drizzle-kit` from `package.json`.

Toast UI is covered by the design system — don't add shadcn's `sonner` for it (`pnpm ds props Toast`). Theme switching (`next-themes`) is not pre-wired; if you add it, mount `ThemeProvider` in the root layout with `attribute="data-theme"` so it drives the design system's dark theme.

---

## Do Not

- Do not commit directly to `main`. Use feature branches and PRs.
- Do not use `any` without a `// eslint-disable-next-line` comment explaining why.
- Do not add `console.log` (only `console.warn`/`console.error` are permitted by ESLint).
- Do not bypass pre-commit hooks without a documented reason.
- Do not manually edit files in `src/components/ui/` to match a new shadcn version — re-add the component instead.
- Do not hand-roll a component or reach for shadcn/an external library before running `pnpm ds` to check whether the design system already covers it — see [docs/design-system.md](docs/design-system.md).
- Do not install another component library (MUI, Chakra, Ant Design, Mantine, HeroUI, Headless UI, DaisyUI) or import Radix directly outside `src/components/ui/` — ESLint blocks it.
- Do not hardcode colors, radii, shadows, durations, or font sizes. Use `@elirobinson/tokens` (`pnpm ds tokens`).
- Do not paste a design system component inventory into a doc — it will go stale. Link to `pnpm ds` instead.
- Do not import a design system package bare (`@elirobinson/react`). There are no barrel files; name a subpath — ESLint blocks it, and it wouldn't resolve anyway.
- Do not ship UI that fails a `pnpm ds contracts` constraint (touch targets, visible focus, WCAG AA contrast, forwarded refs).
