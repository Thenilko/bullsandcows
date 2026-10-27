import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml', environment: 'dev' },
      miniflare: {
        bindings: {
          ENVIRONMENT: 'test',
          SUPABASE_URL: 'https://test-project.supabase.co',
          SUPABASE_ANON_KEY: 'test-anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
          DAILY_SALT: 'test-daily-salt-0123456789',
        },
      },
    }),
  ],
  // `*.pg.test.ts` need a real Postgres and run in Node (vitest.pg.config.ts).
  test: {
    name: 'server',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.pg.test.ts', '**/node_modules/**'],
  },
})
