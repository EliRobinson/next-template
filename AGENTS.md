# Agent & AI Collaboration Guide

This file is the single source of truth for AI agents and humans working in this codebase. `CLAUDE.md` is a symlink to this file.

---

## Project Overview

A production-ready **Next.js 15** starter template. Built with the App Router, TypeScript strict mode, Tailwind CSS v4, shadcn/ui components, TanStack data libraries, and a full quality-gate toolchain.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5 (strict, `@/*` path alias → `src/*`) |
| Styling | Tailwind CSS v4 + shadcn/ui (New York style, neutral base) |
| Data fetching | TanStack Query v5 |
| Tables | TanStack Table v8 |
| Forms | TanStack Form |
| Virtualization | TanStack Virtual |
| Unit/integration tests | Jest + React Testing Library |
| E2E / functional tests | Playwright |
| Package manager | pnpm |
| Linting | ESLint (Next.js flat config + TypeScript ESLint) |
| Formatting | Prettier (with `prettier-plugin-tailwindcss`) |
| Commits | Commitizen + Commitlint (Conventional Commits) |
| Dependency updates | Renovate (auto-merge patch/minor + security) |

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
  types/         # Shared TypeScript types
tests/
  unit/          # Jest + RTL unit & integration tests
e2e/             # Playwright end-to-end tests
```

---

## Development Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm lint         # ESLint check
pnpm lint:fix     # ESLint auto-fix
pnpm format       # Prettier write
pnpm type-check   # tsc --noEmit
pnpm test         # Jest (unit)
pnpm test:e2e     # Playwright (E2E)
pnpm commit       # Commitizen interactive commit
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

### Styling
- Use Tailwind utility classes directly on JSX. Avoid custom CSS files except for CSS variables in `globals.css`.
- Use `cn()` (from `@/lib/utils`) to merge conditional classes.
- Class order is enforced by `prettier-plugin-tailwindcss` — don't hand-sort.
- shadcn components live in `src/components/ui/`. Add them via `pnpm dlx shadcn@latest add <component>`, never manually.

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

### Unit / integration (Jest + RTL)
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

## Adding shadcn Components

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card dialog form input table
```

Components are added to `src/components/ui/` and can be customized freely. Never overwrite them with re-installs — treat them as owned code once added.

---

## Pre-commit Checks (Husky)

The `pre-commit` hook runs `lint-staged`:
- `*.{ts,tsx,js,jsx}` → ESLint fix + Prettier
- `*.{json,css,md,yml}` → Prettier

The `commit-msg` hook runs `commitlint` to enforce Conventional Commits.

To skip hooks in an emergency: `git commit --no-verify` (discouraged — fix the underlying issue instead).

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

Copy `.env.example` to `.env.local` for local development (create `.env.example` when you add the first env var). Never commit `.env.local` or any file containing secrets.

Prefix client-side variables with `NEXT_PUBLIC_`.

---

## Do Not

- Do not commit directly to `main`. Use feature branches and PRs.
- Do not use `any` without a `// eslint-disable-next-line` comment explaining why.
- Do not add `console.log` (only `console.warn`/`console.error` are permitted by ESLint).
- Do not bypass pre-commit hooks without a documented reason.
- Do not manually edit files in `src/components/ui/` to match a new shadcn version — re-add the component instead.
