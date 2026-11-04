import { expect, test } from '@playwright/test'
import { pinSecret, typeGuess } from './helpers'
import { expectNoSideScroll, startSolo } from './journey'

// A first-time visitor: no „seen“ flag from the config's storage state.
test.use({ storageState: { cookies: [], origins: [] } })

const STEPS = [
  'Познай скритото число',
  'Бикове и крави',
  'Пасището и тефтерчето',
  'Как можеш да играеш',
  'Расти и събирай',
  'Къде какво има',
]

test('a first visit offers the tour; skipping it keeps it away', async ({ page }) => {
  await page.goto('/login')
  const tour = page.getByRole('dialog', { name: 'Въведение в играта' })
  await expect(tour).toContainText('Добре дошъл на пасището')
  await expectNoSideScroll(page)
  await tour.getByRole('button', { name: 'Пропусни, ще се оправя' }).click()
  await expect(tour).toBeHidden()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Влез' })).toBeVisible()
  await expect(tour).toBeHidden()
})

test('the tour walks through every step and can be replayed from the rules', async ({ page }) => {
  await page.goto('/login')
  const tour = page.getByRole('dialog', { name: 'Въведение в играта' })
  await tour.getByRole('button', { name: 'Покажи ми' }).click()
  for (const [i, title] of STEPS.entries()) {
    await expect(tour.getByRole('heading', { name: title })).toBeVisible()
    await expect(
      tour.getByRole('img', { name: `Стъпка ${i + 1} от ${STEPS.length}` }),
    ).toBeVisible()
    await expectNoSideScroll(page)
    if (i < STEPS.length - 1) await tour.getByRole('button', { name: 'Напред' }).click()
  }
  await tour.getByRole('button', { name: 'Да играем!' }).click()
  await expect(tour).toBeHidden()

  await page.goto('/rules')
  await expect(tour).toBeHidden()
  await page.getByRole('button', { name: 'Покажи въведението' }).click()
  await expect(tour.getByRole('heading', { name: STEPS[0] })).toBeVisible()
  await tour.getByRole('button', { name: 'Пропусни' }).click()
  await expect(tour).toBeHidden()
})

test('the tour stays off the legal pages', async ({ page }) => {
  await page.goto('/privacy')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Въведение в играта' })).toBeHidden()
})

test('on a phone the first game points at the notebook, then explains the attempts board', async ({
  page,
}, info) => {
  test.skip(!info.project.use.isMobile, 'the desktop notebook is always open')
  await pinSecret(page, '**/api/games', '1234')
  await page.goto('/login')
  await page
    .getByRole('dialog', { name: 'Въведение в играта' })
    .getByRole('button', { name: 'Пропусни, ще се оправя' })
    .click()
  await page.getByRole('button', { name: 'Играй като гост' }).click()
  await expect(page).toHaveURL(/\/new$/)
  await page.getByRole('button', { name: '4', exact: true }).click()
  await page.getByRole('button', { name: 'Свободно' }).click()
  await page.getByRole('button', { name: 'Старт', exact: true }).click()
  await startSolo(page)

  const notesTip = page.getByTestId('coach-notes')
  await expect(notesTip).toContainText('Това е тефтерчето')
  await expectNoSideScroll(page)
  await notesTip.getByRole('button', { name: 'Разбрах' }).click()
  await expect(notesTip).toBeHidden()

  await typeGuess(page, '5678')
  const board = page.getByRole('region', { name: 'Твоите опити' })
  await expect(board.getByText('5678')).toBeVisible()
  const boardTip = page.getByTestId('coach-board')
  await expect(boardTip).toContainText('Крава')
  await boardTip.getByRole('button', { name: 'Разбрах' }).click()

  await board.getByRole('button', { name: 'Отвори тефтерчето' }).click()
  await expect(
    page.getByRole('dialog').getByRole('list', { name: 'Опити' }).getByText('5678'),
  ).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Затвори' }).click()

  await page.reload()
  await expect(board.getByText('5678')).toBeVisible()
  await expect(page.getByRole('note')).toHaveCount(0)
})
