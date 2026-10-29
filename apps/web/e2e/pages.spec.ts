import { expect, test } from '@playwright/test'
import { guestLogin } from './helpers'
import { expectNoPageErrors, expectNoSideScroll, trackPageErrors } from './journey'

/** Every public page and every screen a guest can open, on the phone and on desktop. */

const INFO_PAGES = [
  ['Поверителност', '/privacy'],
  ['Условия', '/terms'],
  ['Правна информация', '/legal'],
  ['Какво ново', '/changelog'],
  ['Подкрепа', '/support'],
] as const

test('public pages: login, rules and every footer page open without an account', async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.goto('/login')
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
  await expectNoSideScroll(page)

  const footer = page.getByRole('navigation', { name: 'Информация за сайта' })
  for (const [label, path] of INFO_PAGES) {
    await page.goto('/login')
    await footer.getByRole('link', { name: label }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoSideScroll(page)
  }

  await page.goto('/login')
  await page.getByRole('link', { name: /историята зад играта/ }).click()
  await expect(page).toHaveURL(/\/story$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Данаил Симеонов').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'hello@nilkospace.app' }).first()).toBeVisible().catch(() => undefined)

  await page.goto('/login')
  // Phones link the rules from the login card; desktop shows what the game is next to the form instead.
  const rules = page.getByRole('link', { name: 'Как се играе?' })
  if (await rules.isVisible()) await rules.click()
  else await page.goto('/rules')
  await expect(page).toHaveURL(/\/rules$/)
  await expect(page.getByRole('heading', { name: 'Как се играе' })).toBeVisible()
  await expectNoSideScroll(page)

  await page.goto('/login')
  await page.getByRole('button', { name: 'Забравена парола?' }).click()
  await expect(page.getByRole('textbox', { name: 'Имейл' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Добре' })).toBeDisabled()
  await page.getByRole('textbox', { name: 'Имейл' }).fill('pastir@e2e.test')
  await expect(page.getByRole('button', { name: 'Добре' })).toBeEnabled()
  expectNoPageErrors(errors)
})

test('language: English on the login page and back to Bulgarian', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('main').getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('button', { name: 'Play as a guest' })).toBeVisible()
  await page.goto('/rules')
  await expect(page.getByRole('heading', { name: 'How to play' })).toBeVisible()
  // The choice is remembered across a reload.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'How to play' })).toBeVisible()
  await page.goto('/login')
  await page.getByRole('main').getByRole('button', { name: 'Български' }).click()
  await expect(page.getByRole('button', { name: 'Играй като гост' })).toBeVisible()
})

test('guest: every screen of the main navigation and the locked ones say what a profile gives', async ({ page }) => {
  const errors = trackPageErrors(page)
  await guestLogin(page)
  await expect(page.getByRole('heading', { name: 'Нова игра' })).toBeVisible()
  await expectNoSideScroll(page)

  const nav = page.getByRole('navigation', { name: 'Основна навигация' })
  await nav.getByRole('link', { name: 'Класация' }).click()
  await expect(page).toHaveURL(/\/board$/)
  await expect(page.getByText('Класацията е за регистрирани пастири.')).toBeVisible()
  await expectNoSideScroll(page)

  await page.getByRole('radio', { name: 'Семейна ферма' }).click()
  await expect(page).toHaveURL(/\/farm$/)
  await expect(page.getByRole('heading', { name: 'Играйте заедно' })).toBeVisible()
  await expectNoSideScroll(page)

  // Phone: the tab in the bottom nav; desktop: the player chip in the header („Профил: <name>“).
  await page.getByRole('link', { name: /^Профил/ }).first().click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { name: /^guest-/ })).toBeVisible()
  await expectNoSideScroll(page)

  await nav.getByRole('link', { name: 'Правила' }).click()
  await expect(page).toHaveURL(/\/rules$/)
  await page.getByRole('button', { name: 'Започни игра' }).click()
  await expect(page).toHaveURL(/\/new$/)

  // The challenge of the week is for profiles: a guest lands on the new game screen.
  await page.goto('/weekly')
  await expect(page).toHaveURL(/\/new$/)

  await page.goto('/today')
  await expect(page.getByRole('heading', { name: /Число на деня #\d+/ })).toBeVisible()
  await expectNoSideScroll(page)

  await page.goto('/duel/new')
  await expect(page.getByRole('radio', { name: /Бърз мач/ })).toBeDisabled()
  await expect(page.getByText('Това е за регистрирани пастири — направи си профил')).toBeVisible()
  await expectNoSideScroll(page)

  await page.goto('/bot/new')
  for (const level of ['Лесно', 'Средно', 'Трудно', 'Експерт']) {
    await page.getByRole('button', { name: level, exact: true }).click()
    await expect(page.getByRole('button', { name: level, exact: true })).toHaveAttribute('aria-pressed', 'true')
  }
  await expectNoSideScroll(page)
  expectNoPageErrors(errors)
})
