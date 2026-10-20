import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const THEME = '#F6F2E6'

// E2E_API_PORT lets parallel checkouts run their own Worker for the E2E suite.
const API_ORIGIN = `http://127.0.0.1:${process.env.E2E_API_PORT ?? '8787'}`
const proxy = {
  '/api': { target: API_ORIGIN, changeOrigin: true },
  '/ws': { target: API_ORIGIN, ws: true },
}

const pwa = VitePWA({
  registerType: 'autoUpdate',
  // The service worker only exists in production builds; dev and tests never register it.
  devOptions: { enabled: false },
  includeAssets: ['icons/apple-touch-icon.png'],
  manifest: {
    name: 'Бикове и крави',
    short_name: 'Пасището',
    lang: 'bg',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: THEME,
    theme_color: THEME,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    navigateFallback: '/index.html',
    // API, WebSocket and dev pages are never served from the shell cache.
    navigateFallbackDenylist: [/^\/api\//, /^\/ws\//, /^\/dev\//],
    globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/fonts/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'fonts',
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 8 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})

const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react(), pwa],
  resolve: {
    alias: {
      '@bc/game-core': fromRoot('../../packages/game-core/src/index.ts'),
      '@bc/i18n': fromRoot('../../packages/i18n/src/index.ts'),
      '@bc/protocol': fromRoot('../../packages/protocol/src/index.ts'),
    },
  },
  server: { proxy },
  preview: { proxy },
})
