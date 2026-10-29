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

/** Every spec starts as a returning visitor; onboarding.spec clears this to meet the first-visit tour. */
const SEEN_TOUR = [{ name: 'bc.onboarding.v1', value: 'e2e' }]
const STORAGE_STATE = {
  cookies: [],
  origins: [WEB_PORT, GALLERY_PORT].map((port) => ({ origin: `http://127.0.0.1:${port}`, localStorage: SEEN_TOUR })),
}

/** Compact phone projects (the MK1–MK12 row): touch + mobile emulation at the heights real browsers leave. */
const compact = (name: string, width: number, height: number) => ({
  name,
  testMatch: /compact\.spec\.ts/,
  use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' as const, viewport: { width, height } },
})

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
    storageState: STORAGE_STATE,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      testMatch: /(solo|duel|bot|share|badges|pages|modes|duels|account|onboarding)\.spec\.ts/,
      // Chromium engine with the iPhone 13 viewport (390 wide); only Chromium is installed in CI.
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'desktop',
      // farm.spec and weekly.spec set their own artboard sizes (390×844 … 1440×900), so they run once, here.
      testMatch: /(solo|duel|bot|share|badges|farm|weekly|pages|modes|duels|account|onboarding)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    compact('mk-660', 390, 660),
    compact('mk-667', 375, 667),
    compact('mk-600', 390, 600),
    compact('mk-630', 390, 630),
    {
      // Screenshot regression and axe over the dev gallery (a build with VITE_DEV_SCREENS=1).
      name: 'gallery',
      testMatch: /(screens|a11y|pasture)\.spec\.ts/,
      // Independent page loads of a static build: CI shards split them by test, not by file (a11y alone is 180).
      fullyParallel: true,
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
