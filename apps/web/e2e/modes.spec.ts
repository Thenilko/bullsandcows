import { expect, test, type Page } from '@playwright/test'
import { guestLogin, newPlayer, typeGuess } from './helpers'
import { expectNoPageErrors, expectNoSideScroll, inNotebook, startSolo, trackPageErrors } from './journey'

/** Every solo mode: free games of 3, 4 and 5 digits with and without 0, and the number of the day. */

const pinFreeSecret = (page: Page, secret: string) =>
  page.route('**/api/games', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()
    return route.continue({ headers: { ...request.headers(), 'x-test-secret': secret } })
  })

const FREE = [
  { len: '3', zero: false, secret: '123', wrong: '456', options: '504' },
  { len: '4', zero: true, secret: '1023', wrong: '4567', options: '5040' },
  { len: '5', zero: true, secret: '10234', wrong: '56789', options: '30240' },
] as const

for (const mode of FREE) {
  test(`free game ${mode.len} digits${mode.zero ? ' with 0' : ''}: play, notebook, win, „Още веднъж!“`, async ({ page }) => {
    const errors = trackPageErrors(page)
    await pinFreeSecret(page, mode.secret)
    await guestLogin(page)
    await page.getByRole('button', { name: mode.len, exact: true }).click()
    if (mode.zero) await page.getByRole('switch', { name: 'Разреши цифрата 0' }).click()
    await expect(page.getByText(`${mode.options} възможни числа`)).toBeVisible()
    await page.getByRole('button', { name: 'Свободно' }).click()
    await page.getByRole('button', { name: 'Старт', exact: true }).click()
    await expect(page).toHaveURL(/\/play\/[^/]+$/)
    await expect(page.getByText(`${mode.len} цифри · свободна игра`, { exact: false })).toBeVisible()
    await startSolo(page)
    await expectNoSideScroll(page)

    // Erase works, then a wrong guess lands in the notebook.
    await page.getByRole('button', { name: `Цифра ${mode.wrong[0]}`, exact: true }).click()
    await page.getByRole('button', { name: 'Изтрий' }).click()
    await typeGuess(page, mode.wrong)
    await inNotebook(page, async () => {
      await expect(page.getByRole('list', { name: 'Опити' }).getByText(mode.wrong)).toBeVisible()
    })

    await typeGuess(page, mode.secret)
    await expect(page).toHaveURL(/\/result\/[^/]+$/)
    await expect(page.getByText(`ЧИСЛОТО Е ${mode.secret}`)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Резултат' })).toContainText(/2\s*опита/)
    await expectNoSideScroll(page)

    await page.getByRole('button', { name: 'Още веднъж!' }).click()
    await expect(page).toHaveURL(/\/(new|play\/[^/]+)$/)
    expectNoPageErrors(errors)
  })
}

test('solo: „Меню“ leaves a running game and the game waits where it was', async ({ page }) => {
  await pinFreeSecret(page, '1234')
  await guestLogin(page)
  await page.getByRole('button', { name: 'Свободно' }).click()
  await page.getByRole('button', { name: 'Старт', exact: true }).click()
  await expect(page).toHaveURL(/\/play\/[^/]+$/)
  const playUrl = page.url()
  await startSolo(page)
  await typeGuess(page, '5678')
  // Phones: „Меню“ over the game; desktop: the header navigation stays.
  const exit = page.getByRole('button', { name: 'Изход от играта' })
  if (await exit.isVisible()) await exit.click()
  else await page.getByRole('navigation', { name: 'Основна навигация' }).getByRole('link', { name: 'Класация' }).click()
  await expect(page).not.toHaveURL(playUrl)
  await page.goto(playUrl)
  await inNotebook(page, async () => {
    await expect(page.getByRole('list', { name: 'Опити' }).getByText('5678')).toBeVisible()
  })
})

test('number of the day: one player gives up, the other wins it with the same number', async ({ page, browser }, info) => {
  const second = await newPlayer(browser, info)
  try {
    await guestLogin(page)
    await page.goto('/today')
    await page.getByRole('button', { name: 'Играй сега' }).click()
    await expect(page).toHaveURL(/\/play\/[^/]+$/)
    await expect(page.getByText(/число(то)? на деня #\d+/i).first()).toBeVisible()
    await startSolo(page)
    await typeGuess(page, '1234')
    // „Предавам се“ is in the notebook (the sheet on phones); the result replaces the game.
    await inNotebook(page, async () => {
      await page.getByRole('button', { name: 'Предавам се' }).click()
      await expect(page).toHaveURL(/\/result\/[^/]+$/)
    })
    const kicker = await page.getByText(/ЧИСЛОТО БЕШЕ \d{4}/).first().innerText()
    const secret = /\d{4}/.exec(kicker)?.[0] ?? ''
    expect(secret).toHaveLength(4)

    // The day's number is the same for everyone: the second player wins it in one go.
    await guestLogin(second)
    await second.getByRole('button', { name: 'Дневно' }).click()
    await second.getByRole('button', { name: 'Старт', exact: true }).click()
    await expect(second).toHaveURL(/\/play\/[^/]+$/)
    await startSolo(second)
    await typeGuess(second, secret)
    await expect(second).toHaveURL(/\/result\/[^/]+$/)
    await expect(second.getByText(`ЧИСЛОТО Е ${secret}`)).toBeVisible()
    await expect(second.getByRole('img', { name: '5 от 5 звезди' })).toBeVisible()
  } finally {
    await second.context().close()
  }
})
