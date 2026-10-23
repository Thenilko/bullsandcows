import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { LANGS, SCREEN_KEYS, openScreen } from './gallery'

const WIDTHS = [390, 1280] as const

test.use({ reducedMotion: 'reduce' })

for (const screen of SCREEN_KEYS) {
  for (const w of WIDTHS) {
    for (const lang of LANGS) {
      test(`axe ${screen} ${w} ${lang}`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: w === 390 ? 844 : 800 })
        await openScreen(page, screen, lang, w)
        const { violations } = await new AxeBuilder({ page }).analyze()
        const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
        expect(
          blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')) })),
        ).toEqual([])
      })
    }
  }
}
