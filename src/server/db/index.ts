import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '@/env'

import * as schema from './schema'

/**
 * Reuse the connection across hot reloads in dev to avoid exhausting
 * the connection pool.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined
}

function createConnection() {
  const url = env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env.local, or delete src/server/db/ if this project does not need a database.'
    )
  }

  const conn = globalForDb.conn ?? postgres(url)
  if (env.NODE_ENV !== 'production') globalForDb.conn = conn
  return conn
}

export const db = drizzle(createConnection(), { schema })
