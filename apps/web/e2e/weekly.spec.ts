import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * ЧАСТ 3 „Седмично предизвикателство“ end to end at the artboard sizes: П6 / Р7 / П7 (390×844), the compact
 * phone, ПД9–ПД11 (1440×900) and ПДН3 / ПДН4 (1280×768). A member plays the week's game once (from the card
 * in „Нова игра“, giving up from the notebook), then the CTA waits until tomorrow and the server refuses a
 * second start the same day.
 */
const SIZES = [
  [390, 844],
  [390, 660],
  [1440, 900],
  [1280, 768],
] as const

test.use({ reducedMotion: 'reduce', locale: 'bg-BG' })

let seq = 0
async function member(browser: Browser, width: number, height: number): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: 'bg-BG',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  })
  const page = await context.newPage()
  seq += 1
  const name = `Wk${seq}${Date.now().toString(36).slice(-5)}`
  await page.goto('/login')
  await page.getByRole('radio', { name: 'Нов профил' }).click()
  await page.getByLabel('Име в играта').fill(name)
  await page.getByLabel('Имейл').fill(`${name.toLowerCase()}@e2e.test`)
  await page.getByLabel('Парола').fill('secret123')
  await page.getByRole('button', { name: 'Създай профил' }).click()
  await expect(page).toHaveURL(/\/new$/)
  return page
}

/** `POST /api/weekly/start` with the page's own session, as a second tab would send it. */
async function startAgain(page: Page): Promise<{ status: number; code?: string }> {
  return page.evaluate(async () => {
    const raw = localStorage.getItem('bc.session') ?? '{}'
    const token =
      (JSON.parse(raw) as { state?: { session?: { accessToken?: string } } }).state?.session
        ?.accessToken ?? ''
    const res = await fetch('/api/weekly/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = (await res.json()) as { error?: { code?: string } }
    return { status: res.status, code: body.error?.code }
  })
}

for (const [width, height] of SIZES) {
  test(`weekly challenge ${width}×${height}: one game a day`, async ({ browser }) => {
    test.setTimeout(90_000)
    const page = await member(browser, width, height)

    // П6 / ПД10: the card on top of „Нова игра“.
    const card = page.getByTestId('weekly-card')
    await expect(card).toBeVisible()
    await expect(card).toContainText(/Седмица \d+/)
    await card.getByRole('button', { name: 'Играй' }).click()

    // П7 / ПД11: „Седмица N · {правило}“ with the dots; started like a solo game.
    await expect(page).toHaveURL(/\/weekly\/play$/)
    await expect(page.getByText(/^Седмица \d+ · /).first()).toBeVisible()
    await expect(page.getByRole('img', { name: /^Опити: 0 от \d+$/ })).toBeVisible()
    await page.getByRole('button', { name: 'Старт', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Цифра 1', exact: true })).toBeEnabled({
      timeout: 15_000,
    })

    // Give up from the notebook (a sheet on phones, the taped card on desktop): the game is over.
    const opener = page.getByRole('button', { name: 'Тефтерче' })
    if ((await opener.count()) > 0) await opener.click()
    await page.getByRole('button', { name: 'Предавам се' }).click()

    // Р7 / ПД9 / ПДН4: back on the week, the CTA waits until tomorrow.
    await expect(page).toHaveURL(/\/weekly$/)
    const cta = page.getByRole('button', { name: 'Утре пак' })
    await expect(cta).toBeVisible()
    await expect(cta).toBeDisabled()
    const panel = await page.locator('main').boundingBox()
    expect(panel && panel.x + panel.width).toBeLessThanOrEqual(width)

    // A second start the same day is refused by the server.
    expect(await startAgain(page)).toEqual({ status: 409, code: 'ERR_WEEKLY_PLAYED' })

    // The card says so too and leads to the week instead of a game.
    await page.goto('/new')
    await page.getByTestId('weekly-card').getByRole('button', { name: 'Утре пак' }).click()
    await expect(page).toHaveURL(/\/weekly$/)
    await page.context().close()
  })
}
