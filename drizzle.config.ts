import { defineConfig } from 'drizzle-kit'

// Only used if this project needs a database.
// If not: delete this file, src/server/db/, drizzle-orm, postgres,
// and drizzle-kit from package.json, and DATABASE_URL from src/env.ts.
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required to run drizzle-kit. Set it in the environment, or delete this config if the project has no database.'
  )
}

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './src/server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl
  },
  strict: true,
  verbose: true
})
