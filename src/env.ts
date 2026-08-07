import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * Type-safe, validated environment variables.
 * Import `env` instead of using `process.env` directly so missing/invalid
 * vars fail fast at build/boot time rather than deep in a request handler.
 *
 * Remove DATABASE_URL if this project doesn't use a database.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: z.string().url().optional()
  },
  client: {
    // Prefix any browser-exposed vars with NEXT_PUBLIC_ and list them here.
    // NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  experimental__runtimeEnv: {
    // NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION
})
