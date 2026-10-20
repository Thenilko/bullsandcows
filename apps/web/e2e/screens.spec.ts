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
