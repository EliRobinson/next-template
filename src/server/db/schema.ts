import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

// Example table — replace with real schema, or delete this file entirely
// if the project doesn't need a database.
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})
