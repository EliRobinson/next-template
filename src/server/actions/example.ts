'use server'

import { z } from 'zod'

const inputSchema = z.object({
  name: z.string().min(1)
})

/**
 * Example server action. Delete once real actions exist.
 * Pattern: validate input with Zod, do the work, return a typed result.
 */
export async function greetAction(input: z.infer<typeof inputSchema>) {
  const { name } = inputSchema.parse(input)
  return { message: `Hello, ${name}!` }
}
