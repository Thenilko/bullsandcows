import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bc/game-core': fromRoot('../../packages/game-core/src/index.ts'),
      '@bc/i18n': fromRoot('../../packages/i18n/src/index.ts'),
      '@bc/protocol': fromRoot('../../packages/protocol/src/index.ts'),
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/ws': { target: 'http://127.0.0.1:8787', ws: true },
    },
  },
})
