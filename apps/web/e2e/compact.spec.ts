import { expect, test, type Locator, type Page } from '@playwright/test'
import { digit, guestLogin, pinSecret, typeGuess, untilPlaying } from './helpers'

/**
 * Compact phones (the MK1–MK12 row): every play screen fits the visible height without a page scroll,
 * the keypad is always whole, the tab bar hides while playing. Runs under the `mk-*` projects (390x660,
 * 375x667, 390x600, touch + mobile emulation).
 */

const SECRET = '1234'
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const

async function expectNoPageScroll(page: Page) {
  const fits = await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement
    return root.scrollHeight <= window.innerHeight && root.scrollTop === 0
  })
  expect(fits, 'the page itself must not scroll').toBe(true)
}

async function expectInViewport(page: Page, target: Locator) {
  const box = await target.boundingBox()
  const vp = page.viewportSize()!
  expect(box, 'element must be rendered').not.toBeNull()
  const { x, y, width, height } = box!
  expect(x >= 0 && y >= 0 && x + width <= vp.width + 0.5 && y + height <= vp.height + 0.5, `fully inside ${vp.width}x${vp.height}: ${JSON.stringify(box)}`).toBe(true)
}

async function expectKeypadWhole(page: Page) {
  for (const d of DIGITS) await expectInViewport(page, digit(page, d))
  await expectInViewport(page, page.getByRole('button', { name: 'Изтрий' }))
  await expectInViewport(page, page.getByRole('button', { name: 'Пусни стадото!' }))
}

async function expectFocusMode(page: Page) {
  await expectNoPageScroll(page)
  await expectKeypadWhole(page)
  await expect(page.getByRole('navigation', { name: 'Основна навигация' })).toBeHidden()
}

/** The full-screen countdown layer covers exactly the viewport. */
async function expectCountdownCoversViewport(page: Page, layer: Locator) {
  await expect(layer).toBeVisible()
  const vp = page.viewportSize()!
  const box = (await layer.boundingBox())!
  expect([Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)]).toEqual([0, 0, vp.width, vp.height])
}

/** Scrolls the panel and every scrolling block inside it (the duel tail under the keypad) to the end. */
async function scrollPanelToEnd(page: Page) {
  await page.locator('main').evaluate((main) => {
    for (const el of [main, ...main.querySelectorAll<HTMLElement>('*')]) {
      const { overflowY } = getComputedStyle(el)
      if (overflowY === 'auto' || overflowY === 'scroll') el.scrollTo(0, el.scrollHeight)
    }
  })
}

/**
 * PasDuel compact play: the scene keeps at least 230px (200px under 640px), so the fence and the animals of
 * the bottom-aligned meadow stay in view; the opponent strip sits under the top row (back, title, sound).
 */
async function expectDuelScene(page: Page) {
  const vp = page.viewportSize()!
  const scene = (await page.getByTestId('scene').boundingBox())!
  const minScene = vp.height < 640 ? 200 : 230
  expect(scene.height, `scene height ${scene.height} within [${minScene}, 380]`).toBeGreaterThanOrEqual(minScene)
  expect(scene.height).toBeLessThanOrEqual(380)
  const strip = page.locator('.ostrip')
  await expectInViewport(page, strip)
  expect(Math.round((await strip.boundingBox())!.y)).toBe(60)
  await expectInViewport(page, page.getByRole('button', { name: 'Към нова игра' }))
}

test('solo: new game, start card, full-screen countdown, focus mode, „Меню“', async ({ page }) => {
  await pinSecret(page, '**/api/games', SECRET)
  await guestLogin(page)

  // MK8: the main button is visible without scrolling; the settings scroll underneath it.
  const start = page.getByRole('button', { name: 'Старт', exact: true })
  await expectNoPageScroll(page)
  await expectInViewport(page, start)
  await scrollPanelToEnd(page)
  await expectInViewport(page, start)
  await page.getByRole('button', { name: 'Свободно' }).click()
  await start.click()
  await expect(page).toHaveURL(/\/play\/[^/]+$/)

  // MK1: the start card is whole, the clock has not started.
  await expectNoPageScroll(page)
  await expectInViewport(page, page.getByRole('heading', { name: 'Числото е скрито в мъглата' }))
  await expectInViewport(page, start)
  await expect(page.getByText('00:00', { exact: true })).toBeVisible()
  await expect(digit(page, '1')).toBeDisabled()

  // MK2: the 3-2-1 covers the whole screen; the card is gone meanwhile.
  await start.click()
  const countdown = page.locator('.cd-screen')
  await expectCountdownCoversViewport(page, countdown)
  await expect(countdown.getByText('3')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Числото е скрито в мъглата' })).toHaveCount(0)
  await untilPlaying(page)
  await expect(countdown).toHaveCount(0)

  // MK3–MK5: the keypad is whole, no page scroll, no tab bar; the attempts live in the notebook.
  await expectFocusMode(page)
  await typeGuess(page, '5678')
  await expectFocusMode(page)
  await page.getByRole('button', { name: 'Тефтерче' }).click()
  await expect(page.getByRole('list', { name: 'Опити' }).getByText('5678')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Предавам се' })).toBeVisible()
  await page.getByRole('button', { name: 'Затвори' }).click()

  // „Меню“ leaves to the leaderboard (the game stays resumable), the tab bar is back there.
  const menu = page.getByRole('button', { name: 'Изход от играта' })
  await expectInViewport(page, menu)
  await menu.click()
  await expect(page).toHaveURL(/\/board$/)
  const nav = page.getByRole('navigation', { name: 'Основна навигация' })
  await expect(nav).toBeVisible()
  // „Игра“ in the tab bar resumes the running game.
  await nav.getByRole('link', { name: 'Игра' }).click()
  await expect(page).toHaveURL(/\/play\/[^/]+$/)
  await expectFocusMode(page)

  // MK7: the result sheet fits as well.
  await typeGuess(page, SECRET)
  await expect(page).toHaveURL(/\/result\/[^/]+$/)
  await expectNoPageScroll(page)
  await expectInViewport(page, page.getByRole('button', { name: 'Още веднъж!' }))
  await expect(page.getByRole('navigation', { name: 'Основна навигация' })).toBeHidden()
})

test('bot race: setup button, „Готов!“, countdown and the race panel fit', async ({ page }) => {
  await pinSecret(page, '**/api/bots', SECRET)
  await guestLogin(page)
  await page.getByRole('button', { name: /^Срещу бот/ }).click()
  await expect(page).toHaveURL(/\/bot\/new$/)

  const cta = page.getByRole('button', { name: 'Срещу Плашилото' })
  await expectNoPageScroll(page)
  await expectInViewport(page, cta)
  await page.getByRole('button', { name: 'Лесно' }).click()
  await page.getByRole('radio', { name: /Надпревара/ }).click()
  await scrollPanelToEnd(page)
  await expectInViewport(page, cta)
  await cta.click()

  // MK9: „Готов!“ and its note are pinned.
  await expect(page).toHaveURL(/\/duel\/[^/]+$/)
  const ready = page.getByRole('button', { name: 'Готов!' })
  await expectNoPageScroll(page)
  await expectInViewport(page, ready)
  await scrollPanelToEnd(page)
  await expectInViewport(page, ready)
  await ready.click()
  await expectCountdownCoversViewport(page, page.locator('.cd'))
  await untilPlaying(page)

  // MK11: the race panel.
  await expectFocusMode(page)
  await expectDuelScene(page)
  await typeGuess(page, '5678')
  await expectFocusMode(page)
  await expectDuelScene(page)
  await expect(page.getByRole('button', { name: 'Предавам се' })).toBeEnabled()
})

test('bot classic: hide the secret, then the classic panel with the opponent card', async ({ page }) => {
  await pinSecret(page, '**/api/bots', SECRET)
  await guestLogin(page)
  await page.getByRole('button', { name: /^Срещу бот/ }).click()
  await page.getByRole('button', { name: 'Лесно' }).click()
  await page.getByRole('radio', { name: /Класически/ }).click()
  await page.getByRole('button', { name: 'Срещу Плашилото' }).click()
  await page.getByRole('button', { name: 'Готов!' }).click()

  // MK10: the secret form is whole: text with the digit count, signs, keypad, the confirm button.
  const confirm = page.getByRole('button', { name: 'Скрий числото' })
  await expect(confirm).toBeVisible({ timeout: 15_000 })
  await expectNoPageScroll(page)
  await expect(page.getByText('4 различни цифри, без 0', { exact: false })).toBeVisible()
  for (const d of DIGITS) await expectInViewport(page, digit(page, d))
  await expectInViewport(page, confirm)
  await expect(page.getByRole('navigation', { name: 'Основна навигация' })).toBeHidden()
  for (const d of '9876') await digit(page, d).click()
  await confirm.click()

  // Both secrets are in: the full-screen 3-2-1, then the classic panel.
  await expectCountdownCoversViewport(page, page.locator('.cd'))
  await expect(page.getByRole('button', { name: 'Пусни стадото!' })).toBeVisible({ timeout: 15_000 })
  await untilPlaying(page)

  // MK12: the keypad stays whole, the opponent card may scroll below it.
  await expectFocusMode(page)
  await expectDuelScene(page)
  await expect(page.getByText('срещу твоето 9876')).toBeAttached()
  await scrollPanelToEnd(page)
  await expectInViewport(page, page.getByRole('button', { name: 'Предавам се' }))
})
