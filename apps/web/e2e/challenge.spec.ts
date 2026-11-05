import { expect, test, type Locator, type Page } from '@playwright/test'
import { registeredPlayer, startSolo } from './journey'

/**
 * A challenge to an online player, on the phone and on the desktop: the card while they are free, and the
 * slim banner during a game („След играта“), which comes back as the card once the game is over.
 */

interface Stored {
  state?: { session?: { accessToken?: string; user?: { id?: string } } }
}

const sessionOf = async (page: Page): Promise<{ token: string; id: string }> => {
  const raw = await page.evaluate(() => localStorage.getItem('bc.session'))
  const s = (JSON.parse(raw ?? '{}') as Stored).state?.session
  return { token: s?.accessToken ?? '', id: s?.user?.id ?? '' }
}

/** `from` challenges `to` through the API (the board's „Предизвикай“ does the same request). */
async function challenge(from: Page, to: Page): Promise<void> {
  const { token } = await sessionOf(from)
  const { id } = await sessionOf(to)
  const status = await from.evaluate(
    async ({ token, id }) => {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: id, len: 4, zero: false, format: 'classic' }),
      })
      return res.status
    },
    { token, id },
  )
  expect(status).toBeLessThan(300)
}

/** Fully on screen: not cut off by the edges of the phone. */
async function expectOnScreen(page: Page, el: Locator): Promise<void> {
  const box = await el.boundingBox()
  const view = page.viewportSize()
  expect(box && view).toBeTruthy()
  if (!box || !view) return
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(view.width + 1)
  expect(box.y + box.height).toBeLessThanOrEqual(view.height + 1)
}

const POLL = { timeout: 25_000 }

test('challenge: the card when free, the banner during a game, „След играта“ brings it back after', async ({
  browser,
}, info) => {
  const a = await registeredPlayer(browser, info, 'Caller')
  const b = await registeredPlayer(browser, info, 'Callee')
  try {
    // Free: the card with „Приеми“ / „Откажи“.
    await challenge(a.page, b.page)
    const card = b.page.getByRole('alertdialog', { name: 'Предизвикателство за дуел' })
    await expect(card).toBeVisible(POLL)
    await expect(card).toContainText(`${a.name} те предизвика на дуел`)
    await expectOnScreen(b.page, card)
    await card.getByRole('button', { name: 'Откажи' }).click()
    await expect(card).toBeHidden()

    // In a game: the slim banner, the keypad stays free.
    await b.page.goto('/new')
    await b.page.getByRole('button', { name: 'Свободно' }).click()
    await b.page.getByRole('button', { name: 'Старт', exact: true }).click()
    await expect(b.page).toHaveURL(/\/play\/[^/]+$/)
    await startSolo(b.page)
    await challenge(a.page, b.page)
    const banner = b.page.getByRole('complementary', { name: 'Предизвикателство за дуел' })
    await expect(banner).toBeVisible(POLL)
    await expect(banner).toContainText(`${a.name} те предизвика на дуел`)
    await expectOnScreen(b.page, banner)
    await expect(b.page.getByRole('button', { name: 'Цифра 1', exact: true })).toBeEnabled()
    await banner.getByRole('button', { name: 'След играта' }).click()
    await expect(banner).toBeHidden()

    // The game is over: the card comes back, „… те чака за дуел“, and „Приеми“ opens the duel.
    await b.page.goto('/new')
    await expect(card).toBeVisible(POLL)
    await expect(card).toContainText(`${a.name} те чака за дуел`)
    await expectOnScreen(b.page, card)
    await card.getByRole('button', { name: 'Приеми' }).click()
    await expect(b.page).toHaveURL(/\/duel\//)
  } finally {
    await a.page.context().close()
    await b.page.context().close()
  }
})
