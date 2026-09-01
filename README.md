# next-template

A production-ready Next.js 16 starter. Clone it, rename it, ship it.

> **UI is built on the [design system](https://github.com/EliRobinson/design-system).** Components and hooks from `@elirobinson/react`, design values from `@elirobinson/tokens`, and the rules agents build under from `@elirobinson/ai-patterns` — for you and for any AI agent working in this repo. Run `pnpm ds` before building screens — it answers what the installed versions offer, so nothing here goes stale. How the packages are wired in: [`docs/design-system.md`](docs/design-system.md).

## What's included

| Category           | Tool                                                                                                     | Notes                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Framework          | [Next.js 16](https://nextjs.org)                                                                         | App Router, Turbopack dev server                                                                      |
| Language           | [TypeScript 5](https://www.typescriptlang.org)                                                           | Strict mode, `@/*` → `src/*` path alias                                                               |
| Styling            | [Tailwind CSS v4](https://tailwindcss.com)                                                               | CSS-first config, no `tailwind.config.ts` needed                                                      |
| Components         | [@elirobinson/react](https://github.com/EliRobinson/design-system)                                       | **Primary component source**; shadcn/ui only fills gaps                                               |
| Design tokens      | [@elirobinson/tokens](https://github.com/EliRobinson/design-system)                                      | Color, type, space, radius, shadow, motion — bridged into Tailwind utilities                          |
| AI UI contracts    | [@elirobinson/ai-patterns](https://github.com/EliRobinson/design-system)                                 | The `pnpm ds` CLI, UI contracts, patterns, prompts, Playwright contract checks                        |
| Data fetching      | [TanStack Query v5](https://tanstack.com/query)                                                          | With devtools, pre-wired provider                                                                     |
| Tables             | [TanStack Table v8](https://tanstack.com/table)                                                          | Headless, fully typed                                                                                 |
| Forms              | [TanStack Form](https://tanstack.com/form)                                                               | Type-safe, validation-ready                                                                           |
| Virtualization     | [TanStack Virtual](https://tanstack.com/virtual)                                                         | Lists and grids                                                                                       |
| Unit tests         | [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com)                      | 70% coverage threshold                                                                                |
| E2E tests          | [Playwright](https://playwright.dev)                                                                     | Chromium, Firefox, Safari, Mobile Chrome                                                              |
| Linting            | [ESLint v9](https://eslint.org)                                                                          | Next.js rules + [`neostandard`](https://github.com/neostandard/neostandard) + design system contracts |
| Formatting         | [Prettier v3](https://prettier.io)                                                                       | `prettier-config-standard` + `prettier-plugin-tailwindcss` for class sorting                          |
| Git hooks          | [Husky v9](https://typicode.github.io/husky) + [lint-staged](https://github.com/lint-staged/lint-staged) | Lint/format on commit                                                                                 |
| Commits            | [Commitizen](https://commitizen-tools.github.io/commitizen/) + [Commitlint](https://commitlint.js.org)   | Conventional Commits enforced                                                                         |
| Dependency updates | [Renovate](https://docs.renovatebot.com)                                                                 | Auto-merge safe updates, security alerts                                                              |
| CI                 | GitHub Actions                                                                                           | Type-check, lint, unit tests, E2E                                                                     |
| Package manager    | [pnpm](https://pnpm.io)                                                                                  |                                                                                                       |

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
# fill in values as needed
```

### 2. Authenticate to GitHub Packages

The design system (`@elirobinson/tokens`, `@elirobinson/react`) installs from a private registry, so pnpm needs a GitHub PAT with `read:packages`. Set it once, at the user level:

```bash
pnpm config set "//npm.pkg.github.com/:_authToken" <your-github-pat> --global
```

This writes to `~/.npmrc`, outside the repo — it is not part of `.env.local`, and it is not a per-shell export. The repo's own `.npmrc` maps the `@elirobinson` scope to the registry and carries no credential, because pnpm 10+ ignores credentials in a committed project `.npmrc`.

### 3. Install dependencies

```bash
pnpm install
```

### 4. Start the dev server

```bash
pnpm dev
```

Each run binds to a random free port and prints it — e.g. `Local: http://localhost:63205` —
so concurrent worktrees or projects never race for the same one. `.claude/launch.json`
detects the actual bound port (`autoPort: true`) rather than assuming a fixed one.

`pnpm test:e2e` is unaffected: it runs a production server (`next start`) on a
fixed port 3000, set independently in `playwright.config.ts` and the E2E job in CI.

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
│   └── unit/                 # Vitest + RTL tests (*.test.tsx)
├── e2e/                      # Playwright tests (*.spec.ts), incl. DS contracts
├── docs/
│   └── design-system.md      # How the design system is wired into this repo
├── .claude/skills/           # Claude Code skills (generated by `pnpm ds init`)
├── .cursor/rules/            # Cursor rules (generated by `pnpm ds init`)
├── .github/
│   ├── copilot-instructions.md # GitHub Copilot instructions
│   └── workflows/ci.yml      # CI pipeline
├── .husky/                   # Git hooks
├── AGENTS.md                 # AI agent guide (CLAUDE.md symlinks here)
├── .npmrc                    # @elirobinson scope → GitHub Packages registry
└── components.json           # shadcn/ui config (fallback)
```

---

## Common tasks

### Build UI with the design system

The [design system](https://github.com/EliRobinson/design-system) is the primary source of components, tokens, and design patterns. Start every UI task by asking the installed packages what they offer:

```bash
pnpm ds                  # components (+ exports & variants), hooks, typography classes, tokens
pnpm ds props Button     # props, variants, and the exact import line to copy
pnpm ds tokens accent    # tokens filtered by name or value
pnpm ds classes          # every CSS class the design system ships
pnpm ds contracts        # UI rules agents must satisfy (touch targets, focus, contrast)
pnpm ds patterns         # working principles and the definition of done for UI work
pnpm ds prompts          # prompt templates: add-component, audit-page, adopt-system
```

`ds` is `elirobinson-ds`, the CLI shipped by `@elirobinson/ai-patterns`. It reads the installed packages at run time, so its output matches the versions in use — including the component directory layout, which it discovers rather than assumes.

```tsx
import { Button } from '@elirobinson/react/components/atoms/Button'
import { Card, CardContent } from '@elirobinson/react/components/molecules/Card'
```

There is no barrel export — `pnpm ds props <Name>` prints the exact subpath, so the layout is never something you have to memorise.

Tokens and component styles are imported in `src/app/layout.tsx`, and `src/app/globals.css` imports `@elirobinson/tokens/tailwind.css` — which is what makes `bg-background`, `text-muted-foreground`, `border-border`, and `text-accent` resolve to brand values instead of nothing at all. Never hardcode a color, radius, shadow, or duration; `@elirobinson/eslint-config` fails the build if you do.

How it's all wired together: [`docs/design-system.md`](docs/design-system.md).

### Update the design system

Bumping the version is the only maintenance needed; nothing in this template hardcodes the design system's contents. Requires the GitHub Packages credential from [step 2](#2-authenticate-to-github-packages):

```bash
pnpm exec ds-resync             # what's out of date, and what changed while you were away
pnpm add @elirobinson/tokens@latest @elirobinson/react@latest
pnpm add -D @elirobinson/ai-patterns@latest @elirobinson/eslint-config@latest
pnpm ds init --agents --force   # refresh the agent-instruction files
```

Even a reorganised package layout is absorbed automatically — `pnpm ds` discovers the component directory structure instead of assuming it.

### Add a shadcn component (fallback)

Only when `pnpm ds` shows the design system doesn't cover what you need, and it can't be composed from existing primitives:

```bash
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu form table sheet tabs
```

Components land in `src/components/ui/` as owned source — edit them freely. See the [shadcn component catalog](https://ui.shadcn.com/docs/components).

### Write a unit test

Create a file in `tests/unit/` ending in `.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/my-component'

describe('MyComponent', () => {
  it('renders the title', () => {
    render(<MyComponent title='Hello' />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
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
import { test, expect } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading')).toBeVisible()
})
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
<type>(<optional scope>): <subject>

feat: add user profile page
fix: correct token expiry calculation
docs: update API usage examples
```

**Types:** `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

Subject casing is not enforced — acronyms and proper nouns can stay capitalized. Breaking changes: use `feat!:` and add a `BREAKING CHANGE:` footer.

### Run all quality checks

```bash
pnpm type-check    # TypeScript
pnpm lint          # ESLint
pnpm format:check  # Prettier
pnpm test          # Vitest
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

| Job       | What it does                                       |
| --------- | -------------------------------------------------- |
| `quality` | `type-check`, `lint`, `format:check`               |
| `unit`    | `vitest run --coverage`, uploads coverage artifact |
| `e2e`     | Playwright on Chromium against a production build  |

Set up branch protection on `main` to require all three jobs before merging.

---

## AI agents

[`AGENTS.md`](AGENTS.md) (symlinked as `CLAUDE.md`) documents conventions for AI agents working in this repo: stack decisions, coding rules, test strategy, and commit standards. Update it as your project evolves.

Design-system-first behavior is reinforced across every surface an agent might read, so you get it whichever tool you use:

| Surface                                                                          | Role                                                              |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md) / `CLAUDE.md`                                           | Primary agent guide — leads with the design system rule           |
| [`docs/design-system.md`](docs/design-system.md)                                 | How the design system is wired into this repo                     |
| [`.claude/skills/design-system/SKILL.md`](.claude/skills/design-system/SKILL.md) | Claude Code skill that fires on any UI task                       |
| [`.cursor/rules/design-system.mdc`](.cursor/rules/design-system.mdc)             | Cursor rule, auto-attached to `.tsx`/`.css` files                 |
| [`.github/copilot-instructions.md`](.github/copilot-instructions.md)             | GitHub Copilot / Copilot Workspace instructions                   |
| `pnpm ds`                                                                        | Live inventory, read from `node_modules` — never stale            |
| [`eslint.config.mjs`](eslint.config.mjs)                                         | `@elirobinson/eslint-config` — the lintable half of the contracts |
| [`e2e/design-system.spec.mts`](e2e/design-system.spec.mts)                       | The half only a browser can settle — targets, focus, contrast     |

The four agent-instruction files are generated by `pnpm ds init --agents`, and none of these hardcode the design system's contents — so a version bump is the only update they ever need. The `@elirobinson/react` 0.4 → 1.1 upgrade in this template reorganised 24 flat components into 45 across three tiers and required no changes to any doc or to `pnpm ds`.
