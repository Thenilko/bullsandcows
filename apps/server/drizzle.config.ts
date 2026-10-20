import { defineConfig } from 'drizzle-kit'

/**
 * `db:generate` needs no database. `db:migrate` reads DATABASE_URL (the Supabase direct
 * connection string, run from CI), never a value committed to the repo.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/adapters/repo/drizzle/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
})
