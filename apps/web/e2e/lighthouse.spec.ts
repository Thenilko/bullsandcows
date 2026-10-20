import { chromium, expect, test } from '@playwright/test'
import type { Flags } from 'lighthouse'

const DEBUG_PORT = 9333
const PROD = 'http://127.0.0.1:4173'
const GALLERY = 'http://127.0.0.1:4174'

const PAGES = [
  { name: 'login', url: `${PROD}/login` },
  { name: 'play-mid', url: `${GALLERY}/dev/screens?screen=play-mid` },
]

test.describe('@slow lighthouse', () => {
  for (const { name, url } of PAGES) {
    test(`lighthouse ${name}`, async () => {
      const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG_PORT}`] })
      try {
        const { default: lighthouse } = await import('lighthouse')
        const flags: Flags = {
          port: DEBUG_PORT,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility'],
          formFactor: 'mobile',
          screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
        }
        const result = await lighthouse(url, flags)
        const lhr = result?.lhr
        if (!lhr) throw new Error('Lighthouse returned no result')
        const perf = Math.round((lhr.categories.performance?.score ?? 0) * 100)
        const a11y = Math.round((lhr.categories.accessibility?.score ?? 0) * 100)
        const lcp = lhr.audits['largest-contentful-paint']?.numericValue ?? Infinity
        const cls = lhr.audits['cumulative-layout-shift']?.numericValue ?? Infinity
        test.info().annotations.push({ type: 'scores', description: `perf=${perf} a11y=${a11y} lcp=${Math.round(lcp)} cls=${cls.toFixed(3)}` })
        expect(lcp).toBeLessThan(2500)
        expect(cls).toBeLessThan(0.1)
        expect(perf).toBeGreaterThanOrEqual(80)
        expect(a11y).toBeGreaterThanOrEqual(95)
      } finally {
        await browser.close()
      }
    })
  }
})
