# next-template

A production-ready Next.js 15 starter. Clone it, rename it, ship it.

## What's included

| Category           | Tool                                                                                                     | Notes                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Framework          | [Next.js 15](https://nextjs.org)                                                                         | App Router, Turbopack dev server                        |
| Language           | [TypeScript 5](https://www.typescriptlang.org)                                                           | Strict mode, `@/*` → `src/*` path alias                 |
| Styling            | [Tailwind CSS v4](https://tailwindcss.com)                                                               | CSS-first config, no `tailwind.config.ts` needed        |
| Components         | [@elirobinson/react](https://github.com/EliRobinson/design-system)                                       | Design system (default); shadcn/ui as fallback for gaps |
| Data fetching      | [TanStack Query v5](https://tanstack.com/query)                                                          | With devtools, pre-wired provider                       |
| Tables             | [TanStack Table v8](https://tanstack.com/table)                                                          | Headless, fully typed                                   |
| Forms              | [TanStack Form](https://tanstack.com/form)                                                               | Type-safe, validation-ready                             |
| Virtualization     | [TanStack Virtual](https://tanstack.com/virtual)                                                         | Lists and grids                                         |
| Unit tests         | [Jest](https://jestjs.io) + [React Testing Library](https://testing-library.com)                         | 70% coverage threshold                                  |
| E2E tests          | [Playwright](https://playwright.dev)                                                                     | Chromium, Firefox, Safari, Mobile Chrome                |
| Linting            | [ESLint v9](https://eslint.org)                                                                          | Flat config, Next.js + TypeScript rules                 |
| Formatting         | [Prettier v3](https://prettier.io)                                                                       | With `prettier-plugin-tailwindcss` for class sorting    |
| Git hooks          | [Husky v9](https://typicode.github.io/husky) + [lint-staged](https://github.com/lint-staged/lint-staged) | Lint/format on commit                                   |
| Commits            | [Commitizen](https://commitizen-tools.github.io/commitizen/) + [Commitlint](https://commitlint.js.org)   | Conventional Commits enforced                           |
| Dependency updates | [Renovate](https://docs.renovatebot.com)                                                                 | Auto-merge safe updates, security alerts                |
| CI                 | GitHub Actions                                                                                           | Type-check, lint, unit tests, E2E                       |
| Package manager    | [pnpm](https://pnpm.io)                                                                                  |                                                         |

---

## Getting started

### Prerequisites

- Node.js ≥ 18 (22 recommended — see `.nvmrc`)
- pnpm 9: `npm i -g pnpm`

### 1. Clone and configure environment variables

```bash
git clone https://github.com/EliRobinson/next-template.git my-app
cd my-app
nvm use        # or: node --version should be ≥ 18
cp .env.example .env.local
# fill in values as needed, including NODE_AUTH_TOKEN (a GitHub PAT with
# read:packages) so pnpm can install @elirobinson/tokens and @elirobinson/react
```

### 2. Install dependencies

`.env.local` isn't auto-loaded by pnpm/npm — export it into your shell first:

```bash
export $(grep -v '^#' .env.local | xargs)
pnpm install
```

### 3. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
.
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout (fonts, providers)
│   │   ├── page.tsx          # Home page
│   │   └── globals.css       # Tailwind CSS variables
│   ├── components/
│   │   ├── ui/               # shadcn/ui components (fallback, owned, editable)
│   │   └── providers.tsx     # TanStack Query provider + devtools
│   ├── hooks/                # Custom React hooks
│   ├── lib/
│   │   └── utils.ts          # cn() helper (clsx + tailwind-merge)
│   └── types/                # Shared TypeScript types
├── tests/
│   └── unit/                 # Jest + RTL tests (*.test.tsx)
├── e2e/                      # Playwright tests (*.spec.ts)
├── .github/
│   └── workflows/ci.yml      # CI pipeline
├── .husky/                   # Git hooks
├── AGENTS.md                 # AI agent guide (CLAUDE.md symlinks here)
├── .npmrc                    # @elirobinson scope → GitHub Packages registry
└── components.json           # shadcn/ui config (fallback)
```

---

## Common tasks

### Use a design system component

```tsx
import { Button } from "@elirobinson/react/components/Button";
```

`@elirobinson/react` ([source](https://github.com/EliRobinson/design-system)) is the default component source — check its inventory before adding shadcn or hand-rolling anything. Tokens (`@elirobinson/tokens/tokens.css`) and component styles (`@elirobinson/react/styles.css`) are already imported in `src/app/layout.tsx`.

Installing/updating requires a GitHub PAT with `read:packages` exported as `NODE_AUTH_TOKEN` (the repo's `.npmrc` points the `@elirobinson` scope at `npm.pkg.github.com`):

```bash
export NODE_AUTH_TOKEN=<your-github-pat>
pnpm add @elirobinson/tokens@latest @elirobinson/react@latest
```

### Add a shadcn component (fallback)

Only when the design system doesn't cover what you need:

```bash
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu form table sheet tabs
```

Components land in `src/components/ui/` as owned source — edit them freely. See the [shadcn component catalog](https://ui.shadcn.com/docs/components).

### Write a unit test

Create a file in `tests/unit/` ending in `.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MyComponent } from "@/components/my-component";

describe("MyComponent", () => {
  it("renders the title", () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

Run tests:

```bash
pnpm test            # run once
pnpm test:watch      # watch mode
pnpm test:coverage   # with coverage report
```

### Write an E2E test

Create a file in `e2e/` ending in `.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading")).toBeVisible();
});
```

Run E2E tests (starts dev server automatically):

```bash
pnpm test:e2e         # headless
pnpm test:e2e:ui      # Playwright UI mode
pnpm test:e2e:codegen # record interactions as code
```

Install additional browsers if needed:

```bash
pnpm playwright install --with-deps          # all browsers
pnpm playwright install --with-deps firefox  # specific browser
```

### Make a commit

Use Commitizen for a guided prompt:

```bash
pnpm commit
```

Or write directly — commitlint enforces the format on every `git commit`:

```
<type>(<optional scope>): <lowercase subject>

feat: add user profile page
fix: correct token expiry calculation
docs: update api usage examples
```

**Types:** `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

The subject must be lowercase. Breaking changes: use `feat!:` and add a `BREAKING CHANGE:` footer.

### Run all quality checks

```bash
pnpm type-check    # TypeScript
pnpm lint          # ESLint
pnpm format:check  # Prettier
pnpm test          # Jest
```

---

## Pre-commit hooks

Husky runs automatically on `git commit`:

- **pre-commit** — lint-staged runs ESLint + Prettier on staged files
- **commit-msg** — commitlint validates the commit message format

To skip in an emergency: `git commit --no-verify` (fix the underlying issue instead).

---

## Dependency updates (Renovate)

[Renovate](https://docs.renovatebot.com) opens PRs automatically for dependency updates. Config in [`renovate.json`](renovate.json).

**Auto-merged when CI passes:**

- Patch updates to production dependencies
- Minor + patch updates to devDependencies
- Security vulnerability fixes

**Requires manual review:**

- Major version bumps (labeled `major-update`)

To enable: install the [Renovate GitHub App](https://github.com/apps/renovate) on your repo.

---

## CI

GitHub Actions runs on every push and pull request to `main`. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

| Job       | What it does                                      |
| --------- | ------------------------------------------------- |
| `quality` | `type-check`, `lint`, `format:check`              |
| `unit`    | `jest --coverage`, uploads coverage artifact      |
| `e2e`     | Playwright on Chromium against a production build |

Set up branch protection on `main` to require all three jobs before merging.

---

## AI agents

[`AGENTS.md`](AGENTS.md) (symlinked as `CLAUDE.md`) documents conventions for AI agents working in this repo: stack decisions, coding rules, test strategy, and commit standards. Update it as your project evolves.
