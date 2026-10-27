import { expect, test, type Page } from '@playwright/test'
import { openScreen } from './gallery'

/** The artboard sizes of ЧАСТ 1: Р6/П1/П2 (390×844), the compact phone, ПД1–ПД3 (1440×900), ПДН1 (1280×768). */
const SIZES = [
  [390, 844],
  [390, 660],
  [1440, 900],
  [1280, 768],
] as const

interface Box {
  readonly name: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** Screen-space boxes of the rewards and of what they must leave free: the animals, the sign and the Scarecrow. */
async function boxes(page: Page): Promise<{ rewards: Box[]; keepFree: Box[] }> {
  return page.evaluate(() => {
    const box = (el: Element, name: string) => {
      const r = el.getBoundingClientRect()
      return { name, x: r.x, y: r.y, w: r.width, h: r.height }
    }
    const rewards = [...document.querySelectorAll('[data-reward]')]
      .filter((el) => el.getAttribute('data-reward') !== 'barnColor')
      .map((el) => box(el, el.getAttribute('data-reward') ?? '?'))
    const animals = [...document.querySelectorAll('[data-layer^="animals"] > g')].map((el, i) => box(el, `animal ${i}`))
    const sign = [...document.querySelectorAll('[data-layer="tally"]')].map((el) => box(el, 'sign'))
    const scarecrow = [...document.querySelectorAll('[data-layer="scarecrow"]')].map((el) => box(el, 'scarecrow'))
    return { rewards, keepFree: [...animals, ...sign, ...scarecrow] }
  })
}

const overlap = (a: Box, b: Box): number => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

test.use({ reducedMotion: 'reduce' })

for (const [w, h] of SIZES) {
  test.describe(`${w}×${h}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: w, height: h })
    })

    test('every reward in the scene leaves the animals, the sign and the Scarecrow free', async ({ page }) => {
      await openScreen(page, 'pasture-full', 'bg')
      const { rewards, keepFree } = await boxes(page)
      expect(rewards.map((r) => r.name).sort()).toEqual(['beehive', 'dog', 'goldenVane', 'pond', 'rooster', 'shed', 'sunflowers', 'windmill'])
      expect(keepFree.filter((b) => b.name.startsWith('animal')).length).toBeGreaterThan(0)
      const hits = rewards.flatMap((r) => keepFree.filter((k) => overlap(r, k) > 1).map((k) => `${r.name} × ${k.name}`))
      expect(hits).toEqual([])
    })

    test('the barn colour is a layer of the barn, painted before the animals and never around them', async ({ page }) => {
      await openScreen(page, 'pasture-full', 'bg')
      const facts = await page.evaluate(() => {
        const tint = document.querySelector('[data-reward="barnColor"]')!
        const animals = [...document.querySelectorAll('[data-layer^="animals"]')]
        return {
          blend: getComputedStyle(tint).mixBlendMode,
          fill: tint.getAttribute('fill'),
          before: animals.every((a) => (tint.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0),
          wrapsAnimal: animals.some((a) => tint.contains(a)) || tint.querySelector('.rig') !== null,
        }
      })
      expect(facts).toEqual({ blend: 'hue', fill: '#3B76B8', before: true, wrapsAnimal: false })
    })

    test('„Твоето пасище“: the list and the colour card fit, a switch hides its reward', async ({ page }) => {
      await openScreen(page, 'pasture', 'bg')
      const panel = page.locator('#main')
      await expect(panel.getByRole('list', { name: 'Награди в пасището' })).toBeVisible()
      const box = (await panel.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(w)
      if (w === 1440) expect(Math.round(box.width)).toBe(380)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w)
      await expect(page.locator('[data-reward="dog"]')).toHaveCount(1)
      await panel.getByRole('switch', { name: 'Покажи: Кученце Шаро' }).click()
      await expect(page.locator('[data-reward="dog"]')).toHaveCount(0)
      await panel.getByRole('region', { name: 'Цвят на обора' }).scrollIntoViewIfNeeded()
      await expect(panel.getByRole('radio', { name: 'Цвят на обора: син' })).toBeDisabled()
    })

    test('the unlock modal is whole on screen with both buttons', async ({ page }) => {
      await openScreen(page, 'unlock', 'bg')
      const dialog = page.getByRole('dialog', { name: 'Ново в пасището' })
      await expect(dialog).toContainText('Ниво 15 · ново в пасището')
      const box = (await dialog.boundingBox())!
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(h)
      if (w > 1000) {
        expect(Math.round(box.width)).toBe(520)
        expect(Math.round(box.y)).toBe(110)
      }
      await expect(dialog.getByRole('button', { name: 'Сложи я в пасището' })).toBeInViewport()
      await expect(dialog.getByRole('button', { name: 'По-късно' })).toBeInViewport()
    })
  })
}
