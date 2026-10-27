import { expect, test } from '@playwright/test'
import { LANGS, SCREEN_KEYS, openScreen } from './gallery'

// 1280×768 is the split desktop (DS/DDS artboards), 1440×900 the immersive one (DK/DD artboards).
const WIDTHS = [390, 768, 1280, 1440] as const
const HEIGHTS: Readonly<Record<(typeof WIDTHS)[number], number>> = { 390: 844, 768: 1024, 1280: 768, 1440: 900 }

test.use({ reducedMotion: 'reduce' })

for (const screen of SCREEN_KEYS) {
  for (const w of WIDTHS) {
    for (const lang of LANGS) {
      test(`screenshot ${screen} ${w} ${lang}`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: HEIGHTS[w] })
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
  // Danail's 390x630 check: the fence and the animals plus the whole keypad, no scroll.
  ['mk12-630', 'duel-play-classic', 390, 630],
  ['mk11-630', 'duel-play-race', 390, 630],
  // „Твоето пасище“ and the unlock modal on the compact phone (ЧАСТ 1).
  ['mk-pasture', 'pasture', 390, 660],
  ['mk-unlock', 'unlock', 390, 660],
  // „Семейна ферма“ and the nudge on the compact phone (ЧАСТ 2).
  ['mk-farm', 'farm', 390, 660],
  ['mk-farm-nudge', 'farm-nudge', 390, 660],
  // The weekly challenge on the compact phone (ЧАСТ 3): the week and the game.
  ['mk-weekly', 'weekly', 390, 660],
  ['mk-weekly-play', 'weekly-play', 390, 660],
]

for (const [key, screen, w, h] of COMPACT) {
  test(`screenshot ${key} ${screen} ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await openScreen(page, screen, 'bg', 390)
    await expect(page).toHaveScreenshot(`${key}-${screen}-${w}x${h}.png`, { animations: 'disabled', maxDiffPixelRatio: 0.01 })
  })
}
