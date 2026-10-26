import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { name: 'game-core', include: ['src/**/*.test.ts'] },
})
