# Agent & AI Collaboration Guide

This file is the single source of truth for AI agents and humans working in this codebase. `CLAUDE.md` is a symlink to this file.

---

<!-- design-system:begin -->
<!-- Managed by `elirobinson-ds init --agents`. Edit above or below this block,
     not inside it — re-running init replaces everything between the markers. -->

## UI: design system first

All UI in this repo is built from **`@elirobinson/react`** (components, hooks), **`@elirobinson/tokens`** (color, type, space, radius, shadow, motion), and **`@elirobinson/ai-patterns`** (UI contracts, working patterns, prompt templates). Upstream: https://github.com/EliRobinson/design-system

**Discover, don't document.** Never paste or trust a component inventory, token list, or prop signature — it is wrong as of the next release. Ask the installed packages:

```bash
pnpm ds                  # components (+ exports & variants), hooks, typography classes, token groups
pnpm ds props <Name>     # props, variant unions, and the exact import line to copy
pnpm ds tokens [filter]  # tokens and their values
pnpm ds classes [filter] # CSS classes the design system ships
pnpm ds contracts        # machine-checkable UI rules, each with its check and what verifies it
pnpm ds patterns         # working principles and the definition of done for UI work
pnpm ds prompts [name]   # reusable prompt templates
```

`pnpm exec elirobinson-ds` is the same command if the `ds` script is not wired up.

### Rules

- Import per component with the full subpath. There is no barrel export; a bare `@elirobinson/react` import does not resolve.
- Drive appearance with a component's own `variant` / `size` props. Utility classes are for layout; the design system owns look.
- Colors, radii, shadows, durations, and font sizes come from tokens — mapped utilities, `.t-*` classes, or `var(--token)`. Never a literal.
- With Tailwind v4, `@import '@elirobinson/tokens/tailwind.css'` maps the Tailwind color namespace onto the tokens; without it, utilities like `bg-background` resolve to nothing.
- Dark mode is `[data-theme="dark"]` (`.dark` also works). With `next-themes`, set `attribute="data-theme"`.
- Token overrides go in an **unlayered** `:root` block — `tokens.css` is unlayered, so an override inside `@layer base` silently loses to it. With `next/font`, re-point the families through `--ds-font-sans-override` / `--ds-font-mono-override` instead, with the font class on `<html>`.
- Stylesheets (`@elirobinson/tokens/tokens.css`, then `@elirobinson/react/styles.css`) are imported once in the app shell.
- Missing a piece? Compose from primitives → the repo's sanctioned gap-filler → hand-roll from tokens and flag it as a design system gap worth upstreaming.
- Foreign UI libraries, direct Radix imports, bare `@elirobinson/*` imports, and hardcoded design values are blocked by `@elirobinson/eslint-config`.
- Contract checks a browser has to settle — touch targets, visible focus, WCAG AA contrast — come from `@elirobinson/ai-patterns/testing/playwright`; drop them into the E2E suite.

### UI copy

Functional copy — errors, empty states, helper and hint text, toasts, labels, button text, tooltips, confirmations, validation — is chrome. **State the fact, then the consequence, then the action, and stop.** Never write:

- **Unverifiable frequency claims** — "almost always", "this rarely happens". You do not have that data.
- **Blame attribution** — "on their side", "check your connection". Say what is observable, not whose fault it might be.
- **Filler pacing** — "in a moment", "hang tight".
- **Unprompted reassurance or apology** — "don't worry", "we'll sort it out". Reassurance is allowed only when it answers a question the reader is actually asking, and then it is a fact: "You have not been charged."
- **Escalation paths nobody asked for** — "if it keeps happening, reply to…" belongs in a support surface, not a control.
- **Enthusiasm** — "Great news!", exclamation marks.

```
❌ You have not been charged. This is almost always a passing blip on their side,
   so try again in a moment. If it keeps happening, reply and we'll sort it out.
✅ You have not been charged. Try again.
```

**This governs chrome, not this product's editorial voice.** Marketing prose, conversational surfaces, and written deliverables are content — their voice is a deliberate design decision and this rule says nothing about them. Chrome follows this rule even on a surface that mixes the two. Read as an instruction to flatten the product's voice, it does more harm than the padding it removes.

If functional copy runs past two short sentences, it is explaining, reassuring, or selling — cut it back. `@elirobinson/eslint-config` warns on the literal phrases, over copy props and chrome components only; it never reads ordinary prose.

Before calling UI work done, run `pnpm ds patterns` and work the **Definition of Done for UI work** checklist it prints.

<!-- design-system:end -->

---

## Project Overview

A production-ready **Next.js 16** starter template. Built with the App Router, TypeScript strict mode, Tailwind CSS v4, the [`@elirobinson/react`](https://github.com/EliRobinson/design-system) design system, TanStack data libraries, an optional Drizzle/Postgres database layer, and a full quality-gate toolchain.

---

## Tech Stack

| Layer                  | Choice                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Framework              | Next.js 16 (App Router, Turbopack)                                                                 |
| Language               | TypeScript 5 (strict, `@/*` path alias → `src/*`)                                                  |
| Components & styling   | `@elirobinson/react` + `@elirobinson/tokens` (primary) on Tailwind CSS v4; shadcn/ui as gap-filler |
| UI contracts for AI    | `@elirobinson/ai-patterns` (the `pnpm ds` CLI, contracts, patterns, prompts)                       |
| Data fetching          | TanStack Query v5                                                                                  |
| Tables                 | TanStack Table v8                                                                                  |
| Forms                  | TanStack Form                                                                                      |
| Virtualization         | TanStack Virtual                                                                                   |
| Env validation         | `@t3-oss/env-nextjs` + Zod (`src/env.ts`)                                                          |
| Database (optional)    | Drizzle ORM + Postgres (`src/server/db/`)                                                          |
| Unit/integration tests | Vitest + React Testing Library                                                                     |
| E2E / functional tests | Playwright                                                                                         |
| Package manager        | pnpm                                                                                               |
| Linting                | ESLint (Next.js flat config + `neostandard` + `@elirobinson/eslint-config`)                        |
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
e2e/             # Playwright end-to-end tests, incl. the design system contracts
docs/
  design-system.md # How the design system is wired into this repo
```

---

## Development Commands

```bash
pnpm dev          # Start dev server (Turbopack) on a random free port
pnpm ds           # Design system discovery — see "UI: design system first" above
pnpm exec ds-resync # What's out of date in the design system, and what changed
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

The rules live in [UI: design system first](#ui-design-system-first) above and in `pnpm ds`. What is specific to this repo:

- **This repo's sanctioned gap-filler is shadcn/ui in `src/components/ui/`** — the one place direct Radix imports are allowed. Add via `pnpm dlx shadcn@latest add <component>`, never by hand, and only for a primitive the design system genuinely doesn't cover. Restyle it with design system tokens.
- `src/app/globals.css` imports `@elirobinson/tokens/tailwind.css`, which is what makes `bg-background` and friends resolve. It carries no aliases of its own — a new token needs no edit here.
- Fonts come from the design system: `@elirobinson/tokens/tokens.css` self-hosts Geist and JetBrains Mono, so the app loads no `next/font` faces of its own and `globals.css` declares no `--ds-font-*-override`. Add one only for a family the system does not ship.
- `@elirobinson/tokens/tokens.css` and `@elirobinson/react/styles.css` are imported once in `src/app/layout.tsx`; don't re-import them per component.
- Use Tailwind utilities for layout/spacing on JSX. Avoid custom CSS files.
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

## Visual Verification

- For any front-end change (component, page, layout, styling), take a screenshot of the affected UI before making the change and another after, using the Browser pane / preview tools.
- Attach both screenshots to the PR description (before/after) so reviewers can assess the UI/UX diff without pulling the branch.
- Skip this only when the change has no rendered visual effect (e.g. pure logic, types, non-UI server code).

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
- `e2e/design-system.spec.mts` runs the contract checks a linter can't settle — touch targets, visible focus, WCAG AA contrast — from `@elirobinson/ai-patterns/testing/playwright`. Add a case per route as the app grows. It is `.mts` because the helper is ESM-only and Playwright compiles a plain `.ts` spec to CJS.

---

## Design System

How to build UI is covered in [UI: design system first](#ui-design-system-first) and in `pnpm ds`. This section is only about keeping the packages current.

| Package                      | Provides                                                   | Dependency type |
| ---------------------------- | ---------------------------------------------------------- | --------------- |
| `@elirobinson/react`         | Components and hooks                                       | dependency      |
| `@elirobinson/tokens`        | Color, type, space, radius, shadow, motion, `.t-*` classes | dependency      |
| `@elirobinson/ai-patterns`   | `pnpm ds` CLI, UI contracts, patterns, Playwright checks   | devDependency   |
| `@elirobinson/eslint-config` | The lintable half of the contracts                         | devDependency   |

Updating is the only maintenance this template needs. `pnpm ds` discovers the installed layout, so no doc changes follow — not even when the package reorganises itself:

```bash
pnpm exec ds-resync
```

That prints what is out of date and what changed while you were away. Then:

```bash
pnpm add @elirobinson/tokens@latest @elirobinson/react@latest
pnpm add -D @elirobinson/ai-patterns@latest @elirobinson/eslint-config@latest
pnpm ds init --agents --force   # refresh the four agent-instruction files
pnpm exec ds-resync artifacts --write # regenerate the generated skill trees
```

`ds-resync artifacts` writes the version-stamped component reference and brand skills under `.claude/skills/` — `design-system-reference/`, `ds-resync/`, and `miltinson-design/` — and records what it wrote in `.claude/ds-artifacts.json`. It leaves files you have edited alone unless you pass `--force`, and `--fail-on-drift` exits non-zero when the snapshot and the installed `@elirobinson/react` disagree. Those trees are generated output: they are excluded from ESLint and Prettier, and a fix made in place is overwritten by the next run.

Requires `NODE_AUTH_TOKEN` — see [Environment Variables](#environment-variables).

### Adding shadcn Components (fallback only)

Only reach for shadcn when the design system genuinely doesn't cover the primitive you need:

```bash
pnpm dlx shadcn@latest add dialog
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

Installing or updating any `@elirobinson/*` package (`tokens`, `react`, `ai-patterns`, `eslint-config`) requires a GitHub PAT with `read:packages`. The repo-root `.npmrc` points the `@elirobinson` scope at GitHub Packages, but it deliberately carries **no credential** — set yours once at the user level:

```bash
pnpm config set "//npm.pkg.github.com/:_authToken" <your-PAT> --global
```

That writes to `~/.npmrc`, outside the repo. It is a one-time setup step, not a per-shell export, and it is not stored in `.env.local`.

**Why not a `${NODE_AUTH_TOKEN}` placeholder in the repo's `.npmrc`?** pnpm 10 stopped expanding environment variables in registry credentials read from a project `.npmrc`, because that file is committed and a malicious registry line could exfiltrate the token. A placeholder there resolves to nothing and installs fail with a `401` that names no cause. Credentials have to come from a source pnpm still trusts — `~/.npmrc` or `pnpm config set`.

CI does the same thing explicitly: an `Authenticate to GitHub Packages` step writes the `NODE_AUTH_TOKEN` repository secret into the runner's `~/.npmrc` before installing. The secret is scoped to that step alone, so it is absent from the environment during `pnpm install` and the test and build steps.

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
- Do not hand-roll a component or reach for shadcn/an external library before running `pnpm ds` to check whether the design system already covers it.
- Do not paste a design system component inventory into a doc — it will go stale. Link to `pnpm ds` instead.
- Do not re-implement upstream tooling here. The `ds` CLI, the Tailwind token bridge, the import bans, and the agent-instruction files all ship from the design system; a local copy drifts silently.
- Do not edit inside the `design-system:begin/end` markers in `AGENTS.md`, `.cursor/rules/design-system.mdc`, `.claude/skills/design-system/SKILL.md`, or `.github/copilot-instructions.md` — `pnpm ds init --agents --force` overwrites them.
- Do not ship UI that fails a `pnpm ds contracts` constraint (touch targets, visible focus, WCAG AA contrast, forwarded refs).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
