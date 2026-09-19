# Environment and database

## Environment variables

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local` or any file containing secrets.

All env vars are declared and validated in `src/env.ts` (`@t3-oss/env-nextjs` + Zod). Add new vars there, not just to `.env.example`. The build fails fast if a required var is missing or invalid. Prefix client-side variables with `NEXT_PUBLIC_` and list them in the `client` block of `src/env.ts`.

## GitHub Packages token

Installing or updating any `@elirobinson/*` package needs a GitHub PAT with `read:packages`. The repo `.npmrc` carries no credential. Set yours once at the user level:

```bash
pnpm config set "//npm.pkg.github.com/:_authToken" <your-PAT> --global
```

CI writes the `NODE_AUTH_TOKEN` repository secret into the runner's `~/.npmrc` in an `Authenticate to GitHub Packages` step before installing.

## Database (optional)

`src/server/db/` (Drizzle ORM + Postgres) and `src/server/actions/` (server actions) are scaffolding for projects that need a database. `DATABASE_URL` is optional in `src/env.ts`, but importing `@/server/db` or running `db:*` scripts requires it and fails with a clear error if missing.

Commands: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`.

If a project does not need a database, delete `src/server/db/`, `drizzle.config.ts`, `DATABASE_URL` from `src/env.ts`, the `db:*` scripts, and `drizzle-orm`/`postgres`/`drizzle-kit` from `package.json`.

Toast UI is covered by the design system. Do not add shadcn's `sonner` (`pnpm ds props Toast`). Theme switching (`next-themes`) is not pre-wired. If you add it, mount `ThemeProvider` in the root layout with `attribute="data-theme"`.
