import { expect, test } from '@playwright/test'
import { LANGS, SCREEN_KEYS, openScreen } from './gallery'

const WIDTHS = [390, 768, 1280] as const

test.use({ reducedMotion: 'reduce' })

for (const screen of SCREEN_KEYS) {
  for (const w of WIDTHS) {
    for (const lang of LANGS) {
      test(`screenshot ${screen} ${w} ${lang}`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: w === 390 ? 844 : w === 768 ? 1024 : 800 })
        await openScreen(page, screen, lang)
        await expect(page).toHaveScreenshot(`${screen}-${w}-${lang}.png`, {
          fullPage: true,
          animations: 'disabled',
          maxDiffPixelRatio: 0.01,
        })
      })
    }
  }
}

/** The compact reference row (MK1–MK12), each at the size of its artboard; Bulgarian only. */
const COMPACT: readonly [key: string, screen: string, w: number, h: number][] = [
  ['mk1', 'play-start', 390, 660],
  ['mk2', 'play-countdown', 390, 660],
  ['mk3', 'play-mid', 390, 660],
  ['mk4', 'play-mid', 375, 667],
  ['mk5', 'play-mid', 390, 600],
  ['mk6', 'notebook', 390, 660],
  ['mk7', 'result-win', 390, 660],
  ['mk8', 'new-game', 390, 660],
  ['mk9', 'found', 390, 660],
  ['mk10', 'hide-secret', 390, 660],
  ['mk11', 'duel-play-race', 390, 660],
  ['mk12', 'duel-play-classic', 375, 667],
]

for (const [key, screen, w, h] of COMPACT) {
  test(`screenshot ${key} ${screen} ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await openScreen(page, screen, 'bg', 390)
    await expect(page).toHaveScreenshot(`${key}-${screen}-${w}x${h}.png`, { animations: 'disabled', maxDiffPixelRatio: 0.01 })
  })
}
