import { expect, type Browser, type Page, type TestInfo } from '@playwright/test'
import { newPlayer } from './helpers'

/** Helpers of the whole-game journeys (pages, modes, duels, account) on the mobile and desktop projects. */

let seq = 0
export const uniqueName = (prefix: string): string => {
  seq += 1
  return `${prefix}${seq}${Date.now().toString(36).slice(-5)}`
}

export interface Shepherd {
  page: Page
  name: string
}

/** A registered player (fake auth): „Нов профил“ with a name, an e-mail and a password. */
export async function register(page: Page, prefix: string): Promise<Shepherd> {
  const name = uniqueName(prefix)
  await page.goto('/login')
  await page.getByRole('radio', { name: 'Нов профил' }).click()
  await page.getByLabel('Име в играта').fill(name)
  await page.getByLabel('Имейл').fill(`${name.toLowerCase()}@e2e.test`)
  await page.getByLabel('Парола').fill('secret123')
  await page.getByRole('button', { name: 'Създай профил' }).click()
  await expect(page).toHaveURL(/\/new$/)
  return { page, name }
}

export async function registeredPlayer(browser: Browser, info: TestInfo, prefix: string): Promise<Shepherd> {
  return register(await newPlayer(browser, info), prefix)
}

/** Nothing sticks out sideways: the page never scrolls horizontally. */
export async function expectNoSideScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(1)
}

/** Runs `body` with the notebook open: the sheet on phones, the card that is always there on desktop. */
export async function inNotebook(page: Page, body: () => Promise<void>): Promise<void> {
  await expect(page.getByRole('button', { name: 'Цифра 1', exact: true })).toBeVisible()
  const opener = page.getByRole('button', { name: 'Тефтерче' })
  const sheet = await opener.isVisible()
  if (sheet) await opener.click()
  await body()
  // Closed again unless `body` left the game (giving up opens the result).
  const close = page.getByRole('dialog').getByRole('button', { name: 'Затвори' })
  if (sheet && (await close.count()) > 0) await close.click()
}

/** „Старт“ on the start card, then the keypad unlocks after the 3-2-1. */
export async function startSolo(page: Page): Promise<void> {
  await page.getByRole('main').getByRole('button', { name: 'Старт', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Цифра 1', exact: true })).toBeEnabled({ timeout: 15_000 })
}

/** Collects uncaught page errors; `expectNoPageErrors` fails on any. */
export function trackPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

export function expectNoPageErrors(errors: readonly string[]): void {
  expect(errors, errors.join('\n')).toEqual([])
}
