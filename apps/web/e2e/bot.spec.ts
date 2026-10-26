import { expect, test, type Page } from '@playwright/test'
import { guestLogin, pinSecret, typeGuess, untilPlaying } from './helpers'

const SECRET = '1234'
const WRONG = '5678'

/** The attempts list: inside the notebook sheet on phones, in the notebook card on desktop. */
async function expectGuessListed(page: Page, guess: string) {
  const opener = page.getByRole('button', { name: 'Тефтерче' })
  const sheet = (await opener.count()) > 0
  if (sheet) await opener.click()
  await expect(page.getByRole('list', { name: 'Опити' }).getByText(guess)).toBeVisible()
  if (sheet) await page.getByRole('button', { name: 'Затвори' }).click()
}

test('bot duel: easy race starts at once and is won with the pinned secret', async ({ page }) => {
  await pinSecret(page, '**/api/bots', SECRET)
  await guestLogin(page)

  await page.getByRole('button', { name: /^Срещу бот/ }).click()
  await expect(page).toHaveURL(/\/bot\/new$/)
  await page.getByRole('button', { name: 'Лесно' }).click()
  await page.getByRole('radio', { name: /Надпревара/ }).click()
  await page.getByRole('button', { name: 'Срещу Плашилото' }).click()

  // The bot sits ready from the start, so the player's „Готов!“ alone starts the countdown.
  await expect(page).toHaveURL(/\/duel\/[^/]+$/)
  await expect(page.getByText('готов', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Готов!' }).click()
  await untilPlaying(page)

  // The notebook is there in a duel too (the easy bot needs 9 s or more per move).
  await typeGuess(page, WRONG)
  await expectGuessListed(page, WRONG)
  await typeGuess(page, SECRET)
  await expect(page).toHaveURL(/\/duel\/[^/]+\/result$/)
  await expect(page.getByRole('heading', { name: 'Победа!' })).toBeVisible()
  await expect(page.getByText('Изпревари Плашилото', { exact: false })).toBeVisible()
  await expect(page.getByText(`Числото беше ${SECRET}`, { exact: false })).toBeVisible()
  await expect(page.getByText('РЕЙТИНГ')).toHaveCount(0)
})
