import { defineConfig, devices } from '@playwright/test'

// Override both (E2E_WEB_PORT, E2E_API_PORT) to run next to another checkout's servers;
// the web preview proxies to E2E_API_PORT (see vite.config.ts).
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4173)
const SERVER_PORT = Number(process.env.E2E_API_PORT ?? 8787)

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
      // Chromium engine with the iPhone 13 viewport (390 wide); only Chromium is installed in CI.
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
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
      command: `pnpm --filter web build && pnpm --filter web preview --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      cwd: '../..',
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
