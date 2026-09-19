# Agent & AI Collaboration Guide

This file is the single source of truth for AI agents and humans working in this codebase. `CLAUDE.md` is a symlink to this file. Detail lives in `docs/agents/`. Read the file that matches your task.

A production-ready **Next.js 16** starter template: App Router, TypeScript strict, Tailwind CSS v4, the `@elirobinson/react` design system, TanStack libraries, and an optional Drizzle/Postgres layer.

Domain terms live in `CONTEXT.md` at the repo root. Use its vocabulary rather than inventing your own. Architectural decisions live in `docs/adr/`, one file per decision. Read what is relevant before a structural change. Create either one when the first term or decision needs a home.

Package manager: **pnpm**. Non-standard commands:

```bash
pnpm dev                # Dev server (Turbopack) on a random free port
pnpm ds                 # Design system discovery
pnpm exec ds-resync     # What is out of date in the design system
pnpm commit             # Commitizen interactive commit
```

## Topic guides

- [Coding conventions](docs/agents/coding-conventions.md): TypeScript, React, styling, TanStack Query, errors, comments, copywriting
- [Testing and visual verification](docs/agents/testing.md)
- [Git, hooks, and pull requests](docs/agents/git-and-prs.md): commits, review gate
- [Working with other agents](docs/agents/multi-agent.md)
- [Keeping the design system current](docs/agents/design-system-upkeep.md)
- [Environment and database](docs/agents/environment.md)

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

## Do Not

- Do not commit directly to `main`. Use feature branches and PRs.
- Do not bypass hooks (`--no-verify`).
- Do not ship UI that fails a `pnpm ds contracts` constraint (touch targets, visible focus, WCAG AA contrast, forwarded refs).
- Do not edit inside the `design-system:begin/end` markers. See `docs/agents/design-system-upkeep.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
