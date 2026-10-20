import { defineConfig, devices } from '@playwright/test'

const WEB_PORT = 4173
const SERVER_PORT = 8787
const GALLERY_PORT = 4174

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
      testMatch: /solo\.spec\.ts/,
      // Chromium engine with the iPhone 13 viewport (390 wide); only Chromium is installed in CI.
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'desktop',
      testMatch: /solo\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      // Screenshot regression and axe over the dev gallery (a build with VITE_DEV_SCREENS=1).
      name: 'gallery',
      testMatch: /(screens|a11y)\.spec\.ts/,
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
      // Fixed ports (9333, 4173, 4174): one worker, tests in file order (config-level `workers: 1`).
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  webServer: [
    {
      // Local Worker with fake auth and an in-memory repo .
      command: `pnpm --filter server dev ${SERVER_VARS}`,
      cwd: '../..',
      port: SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter web build && pnpm --filter web preview --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      cwd: '../..',
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      // Separate output dir: the production build in dist/ stays free of the dev gallery.
      command: `VITE_DEV_SCREENS=1 pnpm --filter web exec vite build --outDir dist-gallery --emptyOutDir && pnpm --filter web exec vite preview --outDir dist-gallery --host 127.0.0.1 --port ${GALLERY_PORT} --strictPort`,
      cwd: '../..',
      port: GALLERY_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
