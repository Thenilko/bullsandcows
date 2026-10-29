import { expect, type Browser, type BrowserContextOptions, type Page, type TestInfo } from '@playwright/test'

/** Context options of the running project, so a second player gets the same device and locale. */
export function projectContext(info: TestInfo): BrowserContextOptions {
  const u = info.project.use
  return {
    baseURL: u.baseURL,
    locale: u.locale,
    reducedMotion: u.reducedMotion,
    serviceWorkers: u.serviceWorkers,
    viewport: u.viewport,
    userAgent: u.userAgent,
    deviceScaleFactor: u.deviceScaleFactor,
    isMobile: u.isMobile,
    hasTouch: u.hasTouch,
    storageState: u.storageState,
  }
}

export async function newPlayer(browser: Browser, info: TestInfo): Promise<Page> {
  const context = await browser.newContext(projectContext(info))
  return context.newPage()
}

/** Adds `x-test-secret` to POST requests matching `pattern` (the dev server honours it). */
export async function pinSecret(page: Page, pattern: string, secret: string): Promise<void> {
  await page.route(pattern, async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()
    return route.continue({ headers: { ...request.headers(), 'x-test-secret': secret } })
  })
}

export async function guestLogin(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('button', { name: 'Играй като гост' }).click()
  await expect(page).toHaveURL(/\/new$/)
}

export const digit = (page: Page, d: string) => page.getByRole('button', { name: `Цифра ${d}`, exact: true })

/** Waits until the keypad unlocks (after the 3-2-1 countdown). */
export async function untilPlaying(page: Page): Promise<void> {
  await expect(digit(page, '1')).toBeEnabled({ timeout: 15_000 })
}

export async function typeGuess(page: Page, guess: string): Promise<void> {
  for (const d of guess) await digit(page, d).click()
  await page.getByRole('button', { name: 'Пусни стадото!' }).click()
}
