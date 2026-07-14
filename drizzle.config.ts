import { defineConfig } from "drizzle-kit";

// Only used if this project needs a database.
// If not: delete this file, src/server/db/, drizzle-orm, postgres,
// and drizzle-kit from package.json, and DATABASE_URL from src/env.ts.
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
