# Keeping the design system current

How to build UI is covered in "UI: design system first" in `AGENTS.md` and in `pnpm ds`. This file is only about keeping the packages current.

| Package                      | Provides                                                   | Dependency type |
| ---------------------------- | ---------------------------------------------------------- | --------------- |
| `@elirobinson/react`         | Components and hooks                                       | dependency      |
| `@elirobinson/tokens`        | Color, type, space, radius, shadow, motion, `.t-*` classes | dependency      |
| `@elirobinson/ai-patterns`   | `pnpm ds` CLI, UI contracts, patterns, Playwright checks   | devDependency   |
| `@elirobinson/eslint-config` | The lintable half of the contracts                         | devDependency   |

Updating is the only maintenance this template needs. `pnpm ds` discovers the installed layout, so no doc changes follow.

```bash
pnpm exec ds-resync
```

That prints what is out of date and what changed. Then:

```bash
pnpm add @elirobinson/tokens@latest @elirobinson/react@latest
pnpm add -D @elirobinson/ai-patterns@latest @elirobinson/eslint-config@latest
pnpm ds init --agents --force   # refresh the four agent-instruction files
pnpm exec ds-resync artifacts --write # regenerate the generated skill trees
```

`ds-resync artifacts` writes the version-stamped component reference and brand skills under `.claude/skills/` (`design-system-reference/`, `ds-resync/`, `miltinson-design/`) and records what it wrote in `.claude/ds-artifacts.json`. It leaves files you have edited alone unless you pass `--force`. `--fail-on-drift` exits non-zero when the snapshot and the installed `@elirobinson/react` disagree. Those trees are generated output: excluded from ESLint and Prettier, and a fix made in place is overwritten by the next run.

Requires a GitHub Packages token. See `docs/agents/environment.md`.

## shadcn (fallback only)

Only reach for shadcn when the design system does not cover the primitive you need:

```bash
pnpm dlx shadcn@latest add dialog
```

Components land in `src/components/ui/` and are owned code. Do not overwrite them with re-installs, and do not hand-edit them to match a new shadcn version. Re-add the component instead. If a shadcn component duplicates something the design system later ships, migrate to the design system version and delete the shadcn one.

## Do not

- Do not hand-roll a component or reach for shadcn or an external library before running `pnpm ds`.
- Do not paste a design system component inventory into a doc. It goes stale. Link to `pnpm ds`.
- Do not re-implement upstream tooling (the `ds` CLI, the Tailwind token bridge, the import bans, the agent-instruction files). A local copy drifts silently.
- Do not edit inside the `design-system:begin/end` markers in `AGENTS.md`, `.cursor/rules/design-system.mdc`, `.claude/skills/design-system/SKILL.md`, or `.github/copilot-instructions.md`. `pnpm ds init --agents --force` overwrites them.
