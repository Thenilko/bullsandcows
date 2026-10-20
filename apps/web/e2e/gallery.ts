import type { Page } from '@playwright/test'
import { DEV_SCREEN_KEYS } from '../src/dev/screenKeys'

export const SCREEN_KEYS = DEV_SCREEN_KEYS
export const LANGS = ['bg', 'en'] as const

/** Opens one gallery screen and waits until fonts are ready and the screen has settled. */
export async function openScreen(page: Page, screen: string, lang: string, w?: number) {
  const width = w === 390 || w === 1280 ? `&w=${w}` : ''
  await page.goto(`/dev/screens?screen=${screen}&lang=${lang}${width}`)
  await page.locator('#root > *').first().waitFor()
  await page.evaluate(() => document.fonts.ready)
}
