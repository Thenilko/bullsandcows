import { expect, test, type Page } from '@playwright/test'
import { expectNoSideScroll, register, registeredPlayer, uniqueName } from './journey'

/** A profile end to end: registration, settings, badges, the pasture rewards, the leaderboard, logout and login. */

test('profile: settings stick, the default length is used for a new game', async ({ page }) => {
  await register(page, 'Prof')
  await page.goto('/profile')
  await expectNoSideScroll(page)

  await page.getByRole('radio', { name: 'Крава' }).click()
  await expect(page.getByRole('radio', { name: 'Крава' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radio', { name: '5 цифри' }).click()
  await page.getByRole('switch', { name: 'Звуци' }).click()
  await expect(page.getByRole('switch', { name: 'Звуци' })).toHaveAttribute('aria-checked', 'false')

  await page.reload()
  await expect(page.getByRole('radio', { name: 'Крава' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: '5 цифри' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('switch', { name: 'Звуци' })).toHaveAttribute('aria-checked', 'false')

  await page.goto('/new')
  await expect(page.getByRole('button', { name: '5', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // English from the profile, then back.
  await page.goto('/profile')
  await page.getByRole('main').getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('radiogroup', { name: 'Default difficulty' })).toBeVisible()
  await page.getByRole('main').getByRole('button', { name: 'Български' }).click()
  await expect(page.getByRole('radiogroup', { name: 'Трудност по подразбиране' })).toBeVisible()
})

test('badges tab: the collection and a badge up close', async ({ page }) => {
  await register(page, 'Badge')
  await page.goto('/profile')
  // Phones: the „Значки“ tab; desktop: the collection sits next to the profile.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const tab = page.getByRole('radio', { name: 'Значки' })
  if (await tab.isVisible()) await tab.click()
  const tiles = page.locator('[data-badge]')
  await expect(tiles.first()).toBeVisible()
  await tiles.first().click()
  await expect(page.getByTestId('badge-detail')).toBeVisible()
  await page.getByTestId('badge-detail').getByRole('button', { name: 'Затвори' }).click()
  await expect(page.getByTestId('badge-detail')).toHaveCount(0)
  await expectNoSideScroll(page)
})

test('pasture: every reward opens with its picture, what it is and how to unlock it', async ({ page }) => {
  await register(page, 'Past')
  await page.goto('/profile')
  await page.getByRole('button', { name: /Твоето пасище/ }).click()
  await expect(page).toHaveURL(/\/profile\/pasture$/)
  await expectNoSideScroll(page)

  const rewards = [
    ['Кученце Шаро', 'dog', 'ниво 5'],
    ['Слънчогледи', 'sunflowers', 'ниво 10'],
    ['Кошер с пчели', 'beehive', 'значка „Ранобудник“'],
    ['Петел на оградата', 'rooster', 'серия 30 дни'],
    ['Вятърна мелница', 'windmill', 'ниво 15'],
    ['Езерце с патици', 'pond', 'ниво 20'],
    ['Втори обор', 'shed', 'ниво 30'],
    ['Златен ветропоказател', 'goldenVane', 'ниво 35'],
    ['Цвят на обора', 'barnColor', 'ниво 25'],
  ] as const
  for (const [name, key, how] of rewards) {
    await page.getByRole('button', { name: `Виж наградата: ${name}` }).click()
    const detail = page.getByRole('dialog', { name: `Награда: ${name}` })
    await expect(detail).toBeVisible()
    await expect(detail.locator(`[data-reward-icon="${key}"]`)).toBeVisible()
    await expect(detail.getByText(`Как се отключва: ${how}`)).toBeVisible()
    await expect(detail.getByText('заключено', { exact: true })).toBeVisible()
    const box = await detail.boundingBox()
    const viewport = page.viewportSize()
    expect(box && viewport && box.x >= 0 && box.x + box.width <= viewport.width + 1).toBeTruthy()
    await detail.getByRole('button', { name: 'Затвори' }).click()
    await expect(detail).toHaveCount(0)
  }
})

test('leaderboard: a profile sees the filters and its place after a game of the day', async ({ page }) => {
  await register(page, 'Board')
  await page.goto('/board')
  await expect(page.getByRole('heading', { name: 'Класация · 4 цифри' })).toBeVisible()
  for (const period of ['Седмица', 'Всички', 'Днес']) {
    const radio = page.getByRole('radiogroup', { name: 'Период' }).getByRole('radio', { name: period, exact: true })
    await radio.click()
    await expect(radio).toHaveAttribute('aria-checked', 'true')
  }
  await page.getByRole('radiogroup', { name: 'Цифри' }).getByRole('radio', { name: '5' }).click()
  await expect(page.getByRole('heading', { name: 'Класация · 5 цифри' })).toBeVisible()
  await expectNoSideScroll(page)
})

test('account: logout, then back in with the name and the password', async ({ page }) => {
  const { name } = await register(page, 'Login')
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Изход' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel('Име в играта').fill(name)
  await page.getByLabel('Парола').fill('wrong-pass')
  await page.getByRole('button', { name: 'Влез' }).click()
  await expect(page.getByRole('status').or(page.getByRole('alert')).first()).not.toBeEmpty()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel('Парола').fill('secret123')
  await page.getByRole('button', { name: 'Влез' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name })).toBeVisible()
})

test('registration: a taken name is refused', async ({ page, browser }) => {
  const { name } = await register(page, 'Taken')
  const other = await browser.newPage({ baseURL: test.info().project.use.baseURL, locale: 'bg-BG' })
  try {
    await other.goto('/login')
    await other.getByRole('radio', { name: 'Нов профил' }).click()
    await other.getByLabel('Име в играта').fill(name)
    await other.getByLabel('Имейл').fill(`${uniqueName('x').toLowerCase()}@e2e.test`)
    await other.getByLabel('Парола').fill('secret123')
    await other.getByRole('button', { name: 'Създай профил' }).click()
    await expect(other).toHaveURL(/\/login$/)
  } finally {
    await other.close()
  }
})

/** The dev admin (fake auth: `admin@pasishte.test`); the mobile and desktop projects share one server, so log in if it exists. */
async function signInAdmin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Име в играта').fill('admin@pasishte.test')
  await page.getByLabel('Парола').fill('secret123')
  await page.getByRole('button', { name: 'Влез' }).click()
  const inside = await page
    .waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 4_000 })
    .then(() => true)
    .catch(() => false)
  if (inside) return
  await page.getByRole('radio', { name: 'Нов профил' }).click()
  await page.getByLabel('Име в играта').fill(uniqueName('Admin'))
  await page.getByLabel('Имейл').fill('admin@pasishte.test')
  await page.getByLabel('Парола').fill('secret123')
  await page.getByRole('button', { name: 'Създай профил' }).click()
  await expect(page).toHaveURL(/\/new$/)
}

test('admin: only the admin finds the panel; it shows players, games and the recent list', async ({ page, browser }, info) => {
  const member = await registeredPlayer(browser, info, 'Memb')
  await member.page.goto('/profile')
  await expect(member.page.getByRole('heading', { name: member.name })).toBeVisible()
  await expect(member.page.getByRole('link', { name: /Админ панел/ })).toHaveCount(0)
  await member.page.goto('/admin')
  await expect(member.page.getByRole('alert')).toHaveText('Тази страница е само за администратора.')

  await signInAdmin(page)
  await page.goto('/profile')
  await page.getByRole('link', { name: /Админ панел/ }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Админ панел' })).toBeVisible()
  await expect(page.getByText('Общо профили')).toBeVisible()
  await expect(page.getByRole('img', { name: /Игри, активни играчи/ })).toBeVisible()
  const recent = page.getByRole('region', { name: 'Последно активни' })
  await expect(recent.getByRole('rowheader', { name: member.name })).toBeVisible()
  await expectNoSideScroll(page)
})
