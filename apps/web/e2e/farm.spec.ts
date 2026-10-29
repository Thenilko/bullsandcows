import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * ЧАСТ 2 „Семейна ферма“ end to end, at the artboard sizes: Р4/Р5/П3/П4 (390×844), the compact phone, ПД4–ПД8
 * (1440×900) and ПДН2 (1280×768). One player creates a farm, another joins by the `/ferma/{code}` link (or by
 * typing the code), both are on the farm board, the second gets a nudge on „Игра“ and dismisses it.
 */
const SIZES = [
  [390, 844, 'link'],
  [390, 660, 'code'],
  [1440, 900, 'link'],
  [1280, 768, 'code'],
] as const

test.use({ reducedMotion: 'reduce', locale: 'bg-BG' })

let seq = 0
const uniqueName = (prefix: string) => {
  seq += 1
  return `${prefix}${seq}${Date.now().toString(36).slice(-5)}`
}

async function player(browser: Browser, width: number, height: number, prefix: string) {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'bg-BG', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: test.info().project.use.storageState })
  const page = await context.newPage()
  const name = uniqueName(prefix)
  await page.goto('/login')
  await page.getByRole('radio', { name: 'Нов профил' }).click()
  await page.getByLabel('Име в играта').fill(name)
  await page.getByLabel('Имейл').fill(`${name.toLowerCase()}@e2e.test`)
  await page.getByLabel('Парола').fill('secret123')
  await page.getByRole('button', { name: 'Създай профил' }).click()
  await expect(page).toHaveURL(/\/new$/)
  return { page, name }
}

async function inviteCode(page: Page): Promise<string> {
  const text = (await page.getByTestId('farm-invite').textContent()) ?? ''
  const code = /\/ferma\/([A-Z0-9]{5})/.exec(text)?.[1]
  expect(code, text).toBeTruthy()
  return code ?? ''
}

for (const [width, height, via] of SIZES) {
  test(`family farm ${width}×${height}: create, join by ${via}, board, nudge`, async ({ browser }) => {
    test.setTimeout(90_000)
    const a = await player(browser, width, height, 'Tati')
    const b = await player(browser, width, height, 'Mira')

    // Р4 switch → Р5 → П3 / ПД6.
    await a.page.goto('/board')
    await a.page.getByRole('radio', { name: 'Семейна ферма' }).click()
    await expect(a.page).toHaveURL(/\/farm$/)
    await a.page.getByLabel('Име на фермата').fill('Фермата на Петрови')
    await a.page.getByRole('button', { name: 'Създай и вземи код' }).click()
    await expect(a.page.getByRole('heading', { name: 'Фермата е готова!' })).toBeVisible()
    await expect(a.page.getByRole('button', { name: 'Изпрати поканата…' })).toBeVisible()
    const code = await inviteCode(a.page)

    // Р5: the link pre-fills the code; or the code is typed in lower case.
    if (via === 'link') {
      await b.page.goto(`/ferma/${code}`)
      await expect(b.page.getByLabel('Код от 5 знака')).toHaveValue(code)
    } else {
      await b.page.goto('/farm')
      await b.page.getByLabel('Код от 5 знака').fill(code.toLowerCase())
    }
    await b.page.getByRole('button', { name: 'Влез във фермата' }).click()
    await expect(b.page).toHaveURL(/\/farm$/)
    await expect(b.page.getByRole('heading', { name: 'Фермата на Петрови' })).toBeVisible()

    // Р4: both are on the farm board, the panel stays inside the window.
    await a.page.goto('/farm')
    const today = a.page.getByRole('list', { name: 'Днешното число на деня във фермата' })
    await expect(today.getByText(`${a.name} (ти)`)).toBeVisible()
    await expect(today.getByText(b.name, { exact: true })).toBeVisible()
    await expect(a.page.getByText('2 / 12')).toBeVisible()
    const panel = await a.page.locator('main').boundingBox()
    expect(panel && panel.x + panel.width).toBeLessThanOrEqual(width)

    // П4 / ПД8: the nudge reaches the other player on „Игра“; × dismisses it for good.
    await a.page.getByRole('button', { name: `Напомни на ${b.name}` }).click()
    await expect(today.getByRole('button', { name: 'Подсетен' })).toBeDisabled()
    await b.page.goto('/')
    await expect(b.page).toHaveURL(/\/today$/)
    const banner = b.page.getByTestId('nudge')
    await expect(banner).toContainText(`${a.name} те подсеща`)
    await expect(b.page.getByRole('button', { name: 'Играй сега' })).toBeInViewport()
    await banner.getByRole('button', { name: 'Скрий' }).click()
    await expect(banner).toHaveCount(0)
    await b.page.goto('/new')
    await expect(b.page.getByRole('heading', { name: 'Нова игра' })).toBeVisible()
    await expect(b.page.getByTestId('nudge')).toHaveCount(0)

    await a.page.context().close()
    await b.page.context().close()
  })
}
