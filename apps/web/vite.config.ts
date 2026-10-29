import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { staticHeadersFile } from './build/headers'
import { assertProdAuthEnv } from './build/prodEnv'

const THEME = '#F6F2E6'

// E2E_API_PORT lets parallel checkouts run their own Worker for the E2E suite.
const API_ORIGIN = `http://127.0.0.1:${process.env.E2E_API_PORT ?? '8787'}`
const proxy = {
  '/api': { target: API_ORIGIN, changeOrigin: true },
  '/ws': { target: API_ORIGIN, ws: true },
}

const pwa = VitePWA({
  registerType: 'autoUpdate',
  // Registered from main.tsx through `virtual:pwa-register` (bundled, so the 'self'-only CSP is kept): it also
  // reloads the page once a new worker takes control, which the plugin's plain register script does not.
  injectRegister: null,
  // The service worker only exists in production builds; dev and tests never register it.
  devOptions: { enabled: false },
  includeAssets: ['favicon.ico', 'favicon.svg', 'icons/apple-touch-icon.png'],
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
    // A new worker takes over at once; without these it waits until every tab of the old one is closed, so a
    // phone kept showing the previous deploy (the plugin does not set them for `autoUpdate` on its own).
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    navigateFallback: '/index.html',
    // API, WebSocket and dev pages are never served from the shell cache.
    navigateFallbackDenylist: [/^\/api\//, /^\/ws\//, /^\/dev\//],
    globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
    // The share image and the press kit are downloads, never part of the offline shell.
    globIgnores: ['**/og-image.png'],
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

/** The version and short commit shown in the footer (`v0.2.0 · abc1234`). */
function buildInfo(): { version: string; commit: string } {
  const pkg = JSON.parse(readFileSync(fromRoot('../../package.json'), 'utf8')) as { version?: string }
  let commit = (process.env.GITHUB_SHA ?? process.env.CF_PAGES_COMMIT_SHA ?? '').slice(0, 7)
  if (!commit) {
    try {
      commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch {
      commit = ''
    }
  }
  return { version: pkg.version ?? '0.0.0', commit }
}

/** Writes Cloudflare's `_headers` (CSP and friends) into the build output. */
const securityHeaders = (supabaseUrl: string | undefined): Plugin => ({
  name: 'pasishte-security-headers',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: '_headers', source: staticHeadersFile(supabaseUrl) })
  },
})

export default defineConfig(({ command, mode }) => {
  // Files plus process.env (process.env wins), as the client bundle will see them.
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_')
  if (command === 'build') assertProdAuthEnv(env, mode)
  const info = buildInfo()
  return {
    define: {
      __APP_VERSION__: JSON.stringify(info.version),
      __APP_COMMIT__: JSON.stringify(info.commit),
    },
    plugins: [react(), pwa, securityHeaders(env.VITE_SUPABASE_URL)],
    resolve: {
      alias: {
        '@bc/game-core': fromRoot('../../packages/game-core/src/index.ts'),
        '@bc/i18n': fromRoot('../../packages/i18n/src/index.ts'),
        '@bc/protocol': fromRoot('../../packages/protocol/src/index.ts'),
      },
    },
    server: { proxy },
    preview: { proxy },
  }
})
