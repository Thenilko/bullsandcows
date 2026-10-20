import { expect, test, type Page } from '@playwright/test'

const SECRET = '1234'
const WRONG = '5678'

async function typeGuess(page: Page, guess: string) {
  for (const digit of guess) {
    await page.getByRole('button', { name: `Цифра ${digit}`, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Пусни стадото!' }).click()
}

async function startGame(page: Page) {
  await page.getByRole('button', { name: 'Старт', exact: true }).click()
  // The keypad unlocks once the 3-2-1 countdown is over.
  await expect(page.getByRole('button', { name: 'Цифра 1', exact: true })).toBeEnabled({ timeout: 15_000 })
}

test('solo game: guest login, play to the win, restore after reload', async ({ page }) => {
  // Make the secret deterministic: the dev server honours this header for free games only.
  await page.route('**/api/games', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()
    return route.continue({ headers: { ...request.headers(), 'x-test-secret': SECRET } })
  })

  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('button', { name: 'Играй като гост' }).click()

  // `/` redirects a fresh guest to the new game screen.
  await expect(page).toHaveURL(/\/new$/)
  await page.getByRole('button', { name: '4', exact: true }).click()
  await page.getByRole('button', { name: 'Свободно' }).click()
  await page.getByRole('button', { name: 'Старт', exact: true }).click()

  await expect(page).toHaveURL(/\/play\/[^/]+$/)
  const playUrl = page.url()
  await startGame(page)
  await typeGuess(page, WRONG)
  await expect(page.getByRole('list', { name: 'Опити' }).getByText(WRONG)).toBeVisible()

  // Recovery: the history survives a reload.
  await page.reload()
  await expect(page).toHaveURL(playUrl)
  await expect(page.getByRole('list', { name: 'Опити' }).getByText(WRONG)).toBeVisible()
  if (await page.getByRole('button', { name: 'Старт', exact: true }).isVisible()) await startGame(page)

  await typeGuess(page, SECRET)
  await expect(page).toHaveURL(/\/result\/[^/]+$/)
  await expect(page.getByText(`ЧИСЛОТО Е ${SECRET}`)).toBeVisible()
  const points = page.getByText('точки', { exact: true }).locator('xpath=preceding-sibling::div[1]')
  await expect(points).toBeVisible()
  expect(Number(await points.innerText())).toBeGreaterThan(0)
})
