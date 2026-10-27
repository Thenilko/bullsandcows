import { defineConfig } from 'vitest/config'

/**
 * Opt-in Postgres integration tests (`*.pg.test.ts`) in Node, against a throwaway database:
 * `PG_TEST_URL=postgres://… pnpm --filter server test:pg`. Without `PG_TEST_URL` they are skipped. The database
 * is wiped (schema `public` dropped) and migrated from `drizzle/*.sql`, so never point it at real data.
 */
export default defineConfig({
  test: {
    name: 'server-pg',
    include: ['src/**/*.pg.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
})
