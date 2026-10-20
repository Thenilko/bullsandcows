import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*/vitest.config.ts', 'apps/*/vitest.config.ts'],
    // v8 coverage does not work in the Workers pool (server project), which runs without it
    // (see `pnpm test:coverage`, `--project '!server'`).
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      include: ['packages/*/src/**', 'apps/web/src/**'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', '**/test/**', '**/main.tsx'],
      thresholds: {
        statements: 80,
        'packages/game-core/src/**': { statements: 95 },
      },
    },
  },
})
