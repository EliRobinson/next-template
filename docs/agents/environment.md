# Environment and database

## Environment variables

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local` or any file containing secrets.

All env vars are declared and validated in `src/env.ts` (`@t3-oss/env-nextjs` + Zod). Add new vars there, not just to `.env.example`. The build fails fast if a required var is missing or invalid. Prefix client-side variables with `NEXT_PUBLIC_` and list them in the `client` block of `src/env.ts`.

## GitHub Packages token

Installing or updating any `@elirobinson/*` package needs two npm config lines: the scope mapping and a GitHub PAT with `read:packages`.

```
@elirobinson:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<token>
```

The repo has no `.npmrc`. Every environment supplies both lines itself:

- **Local:** put both lines in `~/.npmrc`, once per machine. Edit the file directly: `pnpm config set --global` writes to pnpm's own `auth.ini` instead.

  ```bash
  printf '@elirobinson:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n' '<your-PAT>' >> ~/.npmrc
  ```

- **CI:** the `Authenticate to GitHub Packages` step in `.github/workflows/ci.yml` writes both lines, taking the token from the `NODE_AUTH_TOKEN` repository secret.
- **Vercel:** the team-shared env var `NPM_RC` holds both lines. Vercel writes `NPM_RC` into the build's npm config before it installs, so a project needs no `vercel.json` or install command. A new project only has to be linked to `NPM_RC` (team **Settings → Environment Variables**, or tick the project when you edit the shared var).

### Adding or rotating `NPM_RC`

`NPM_RC` has two lines. The interactive `vercel env add` prompt keeps only the first line, which drops the token and gives a 401 on install. Set it one of these ways:

- In the Vercel dashboard, paste both lines into the value field.
- Pipe the value on stdin:

  ```bash
  printf '@elirobinson:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n' "$TOKEN" | vercel env add NPM_RC production
  ```

Never commit the token or paste it into a file in the repo.

## Database (optional)

`src/server/db/` (Drizzle ORM + Postgres) and `src/server/actions/` (server actions) are scaffolding for projects that need a database. `DATABASE_URL` is optional in `src/env.ts`, but importing `@/server/db` or running `db:*` scripts requires it and fails with a clear error if missing.

Commands: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`.

If a project does not need a database, delete `src/server/db/`, `drizzle.config.ts`, `DATABASE_URL` from `src/env.ts`, the `db:*` scripts, and `drizzle-orm`/`postgres`/`drizzle-kit` from `package.json`.

Toast UI is covered by the design system. Do not add shadcn's `sonner` (`pnpm ds props Toast`). Theme switching (`next-themes`) is not pre-wired. If you add it, mount `ThemeProvider` in the root layout with `attribute="data-theme"`.
