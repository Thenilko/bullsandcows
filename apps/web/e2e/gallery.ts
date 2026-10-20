import type { Page } from '@playwright/test'
import { FIXTURE_T0 } from '../src/dev/duelFixtures'
import { DEV_SCREEN_KEYS } from '../src/dev/screenKeys'

export const SCREEN_KEYS = DEV_SCREEN_KEYS
export const LANGS = ['bg', 'en'] as const

/** Frozen wall clock (20 s into the duel fixtures) so live clocks and turn timers render the same on every run. */
const FROZEN_NOW = FIXTURE_T0 + 20_000

/** Opens one gallery screen and waits until fonts are ready and the screen has settled. */
export async function openScreen(page: Page, screen: string, lang: string, w?: number) {
  const width = w === 390 || w === 1280 ? `&w=${w}` : ''
  await page.clock.setFixedTime(FROZEN_NOW)
  await page.goto(`/dev/screens?screen=${screen}&lang=${lang}${width}`)
  await page.locator('#root > *').first().waitFor()
  // Lazy gallery screens (duel) render a loading marker until their chunk arrives.
  await page.locator('[data-gallery-loading]').waitFor({ state: 'detached' })
  await page.evaluate(() => document.fonts.ready)
}
