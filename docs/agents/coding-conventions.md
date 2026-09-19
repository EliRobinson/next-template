# Coding conventions

## TypeScript

- Use type imports: `import type { Foo } from "./foo"`.
- Prefer `interface` for object shapes that may be extended; `type` for unions and intersections.

## React & Next.js

- Default to **Server Components**. Add `"use client"` only when browser APIs or hooks are required.
- Server components fetch the data a page needs on first load. Client components use TanStack Query hooks for anything that updates after load.
- Keep Client Components as leaf nodes. Lift them out only when the boundary needs to move.

## Styling & components

The rules live in "UI: design system first" in `AGENTS.md` and in `pnpm ds`. What is specific to this repo:

- **This repo's sanctioned gap-filler is shadcn/ui in `src/components/ui/`.** It is the one place direct Radix imports are allowed. Add via `pnpm dlx shadcn@latest add <component>`, never by hand, and only for a primitive the design system does not cover. Restyle it with design system tokens.
- `src/app/globals.css` imports `@elirobinson/tokens/tailwind.css`, which is what makes `bg-background` and friends resolve. It carries no aliases of its own. A new token needs no edit here.
- Fonts come from the design system. `@elirobinson/tokens/tokens.css` self-hosts Geist and JetBrains Mono, so the app loads no `next/font` faces of its own and `globals.css` declares no `--ds-font-*-override`. Add one only for a family the system does not ship.
- `@elirobinson/tokens/tokens.css` and `@elirobinson/react/styles.css` are imported once in `src/app/layout.tsx`. Do not re-import them per component.
- Use Tailwind utilities for layout and spacing on JSX. Avoid custom CSS files.
- Use `cn()` (from `@/lib/utils`) to merge conditional classes.
- Class order is enforced by `prettier-plugin-tailwindcss`. Do not hand-sort.
- **Use the `copywriting` skill for every piece of user-facing text** before it ships: UI chrome, empty and error states, toasts, labels, and README prose. Load it with the Skill tool, run your copy through it, and hold the result to both that skill and the "UI copy" rules in `AGENTS.md`. The bar is production-ready text with no AI-isms: no "delve", "seamless", "robust", "leverage", "unlock", no em-dash asides, no filler, no hype.

## TanStack Query

- Wrap queries in custom hooks inside `src/hooks/` (for example `useUsers.ts`).
- Export query key factories alongside hooks for cache invalidation.
- Use `suspense: true` + `<Suspense>` boundaries for loading states when possible.

## Error handling

- Validate external input at system boundaries only (API routes, form submissions).
- Use Next.js `error.tsx` files for route-level error boundaries.
- Do not add defensive try/catch for code that cannot throw.

## Comments

- Write no comments by default. Only add one when the WHY is non-obvious: a hidden constraint, a workaround, or a subtle invariant.
