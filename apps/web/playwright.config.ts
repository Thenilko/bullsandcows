import { defineConfig, devices } from '@playwright/test'

// Override the ports (E2E_WEB_PORT, E2E_API_PORT, E2E_GALLERY_PORT) to run next to another checkout's
// servers; the web preview proxies to E2E_API_PORT (see vite.config.ts). The gallery defaults to WEB_PORT + 1.
// Exported through the environment so e2e specs (lighthouse) resolve the same origins.
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4173)
const SERVER_PORT = Number(process.env.E2E_API_PORT ?? 8787)
const GALLERY_PORT = Number(process.env.E2E_GALLERY_PORT ?? WEB_PORT + 1)
process.env.E2E_WEB_PORT = String(WEB_PORT)
process.env.E2E_GALLERY_PORT = String(GALLERY_PORT)

// Hermetic worker vars: fake auth + memory repo come from `[env.dev]`; these satisfy the env schema
// without needing a local `.dev.vars` (nothing here is a real secret).
const SERVER_VARS = [
  'SUPABASE_URL:https://e2e.invalid',
  'SUPABASE_ANON_KEY:e2e-anon-key',
  'SUPABASE_SERVICE_ROLE_KEY:e2e-service-key',
  'DAILY_SALT:e2e-daily-salt-0123456789',
  `APP_ORIGIN:http://127.0.0.1:${WEB_PORT}`,
]
  .map((v) => `--var ${v}`)
  .join(' ')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    locale: 'bg-BG',
    // Infinite animations (the floating Start button) are disabled under reduced motion, so clicks are stable.
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      testMatch: /(solo|duel|bot)\.spec\.ts/,
      // Chromium engine with the iPhone 13 viewport (390 wide); only Chromium is installed in CI.
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'desktop',
      testMatch: /(solo|duel|bot)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      // Screenshot regression and axe over the dev gallery (a build with VITE_DEV_SCREENS=1).
      name: 'gallery',
      testMatch: /(screens|a11y)\.spec\.ts/,
      // Baselines are rendered on macOS; Linux CI skips the pixel comparison (axe still runs)
      // unless CI_SCREENSHOTS=1 (after regenerating them in the Playwright Docker image, see README).
      ignoreSnapshots: !!process.env.CI && !process.env.CI_SCREENSHOTS,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://127.0.0.1:${GALLERY_PORT}`,
        locale: 'bg-BG',
        timezoneId: 'Europe/Sofia',
      },
    },
    {
      // Lighthouse is slow; it only runs via `pnpm e2e:full`.
      name: 'slow',
      testMatch: /lighthouse\.spec\.ts/,
      timeout: 120_000,
      // Fixed debug port 9333 (web/gallery ports come from the env above): one worker, tests in file order (config-level `workers: 1`).
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  webServer: [
    {
      // Local Worker with fake auth and an in-memory repo .
      command: `pnpm --filter server exec wrangler dev --env dev --port ${SERVER_PORT} --inspector-port 0 ${SERVER_VARS}`,
      cwd: '../..',
      port: SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // A hermetic fake-auth build (the production build guard requires saying so).
      command: `VITE_AUTH_MODE=fake pnpm --filter web build && pnpm --filter web preview --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      cwd: '../..',
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      // Separate output dir: the production build in dist/ stays free of the dev gallery.
      command: `VITE_AUTH_MODE=fake VITE_DEV_SCREENS=1 pnpm --filter web exec vite build --outDir dist-gallery --emptyOutDir && pnpm --filter web exec vite preview --outDir dist-gallery --host 127.0.0.1 --port ${GALLERY_PORT} --strictPort`,
      cwd: '../..',
      port: GALLERY_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
