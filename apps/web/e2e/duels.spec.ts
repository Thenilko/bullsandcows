import { expect, test, type Page } from '@playwright/test'
import { digit, guestLogin, newPlayer, pinSecret, typeGuess, untilPlaying } from './helpers'
import { expectNoSideScroll, registeredPlayer } from './journey'

/** Every duel: the quick match, a classic duel with a friend, a rematch and each level of the bot. */

const ready = async (page: Page) => {
  await expect(page).toHaveURL(/\/duel\/[^/]+$/)
  await page.getByRole('button', { name: 'Готов!' }).click()
}

test('quick match: two profiles find each other, one gives up, the other wins with a rating change', async ({ browser }, info) => {
  const a = await registeredPlayer(browser, info, 'Quick')
  const b = await registeredPlayer(browser, info, 'Match')
  try {
    for (const p of [a.page, b.page]) {
      await p.goto('/duel/new')
      await p.getByRole('radio', { name: /Бърз мач/ }).click()
      await p.getByRole('button', { name: 'Търси противник' }).click()
    }
    await expect(a.page.getByRole('heading', { name: 'Противникът е намерен!' })).toBeVisible({ timeout: 20_000 })
    await expect(b.page.getByRole('heading', { name: 'Противникът е намерен!' })).toBeVisible({ timeout: 20_000 })
    await expect(a.page.getByText(b.name)).toBeVisible()
    await expectNoSideScroll(a.page)
    for (const p of [a.page, b.page]) await ready(p)
    await untilPlaying(a.page)
    await untilPlaying(b.page)

    await b.page.getByRole('button', { name: 'Предавам се' }).click()
    await expect(a.page).toHaveURL(/\/duel\/[^/]+\/result$/)
    await expect(a.page.getByRole('heading', { name: 'Победа!' })).toBeVisible()
    await expect(a.page.getByText('РЕЙТИНГ')).toBeVisible()
    await expect(b.page).toHaveURL(/\/duel\/[^/]+\/result$/)
    await expect(b.page.getByRole('heading', { name: 'Загуба' })).toBeVisible()
    await expectNoSideScroll(b.page)
  } finally {
    await a.page.context().close()
    await b.page.context().close()
  }
})

test('quick match: „Откажи търсенето“ leaves the queue', async ({ browser }, info) => {
  const a = await registeredPlayer(browser, info, 'Alone')
  try {
    await a.page.goto('/duel/new')
    await a.page.getByRole('radio', { name: /Бърз мач/ }).click()
    await a.page.getByRole('button', { name: 'Търси противник' }).click()
    await expect(a.page).toHaveURL(/\/duel\/queue/)
    await expect(a.page.getByRole('heading', { name: 'Търсим противник' })).toBeVisible()
    await a.page.getByRole('button', { name: 'Откажи търсенето' }).click()
    await expect(a.page).not.toHaveURL(/\/duel\/queue/)
  } finally {
    await a.page.context().close()
  }
})

/** Hides the classic secret on the secret form. */
async function hideSecret(page: Page, secret: string) {
  const confirm = page.getByRole('button', { name: 'Скрий числото' })
  await expect(confirm).toBeVisible({ timeout: 15_000 })
  for (const d of secret) await digit(page, d).click()
  await confirm.click()
}

test('classic duel with a friend: both hide a number, turns, the host wins, rematch offered and accepted', async ({ page: host, browser }, info) => {
  const guest = await newPlayer(browser, info)
  try {
    await guestLogin(host)
    await host.goto('/duel/new')
    await host.getByRole('radio', { name: /Класически/ }).click()
    await host.getByRole('button', { name: 'Създай покана' }).click()
    await expect(host).toHaveURL(/\/duel\/invite\/[A-Z0-9]{5}$/)
    const code = host.url().split('/').pop() ?? ''

    // The friend opens the invite link directly.
    await guestLogin(guest)
    await guest.goto(`/d/${code}`)
    await guest.getByRole('button', { name: 'Присъедини се' }).click()

    for (const p of [host, guest]) await ready(p)
    await hideSecret(host, '1234')
    await hideSecret(guest, '5678')
    await expect(host.getByRole('button', { name: 'Пусни стадото!' })).toBeVisible({ timeout: 15_000 })
    await expect(guest.getByRole('button', { name: 'Пусни стадото!' })).toBeVisible({ timeout: 15_000 })

    // Whoever moves first, the host guesses the friend's number on their own turn.
    const hostTurn = digit(host, '1')
    const guestTurn = digit(guest, '1')
    await expect(async () => {
      expect((await hostTurn.isEnabled()) || (await guestTurn.isEnabled())).toBe(true)
    }).toPass({ timeout: 15_000 })
    if (!(await hostTurn.isEnabled())) {
      await typeGuess(guest, '9876')
      await expect(hostTurn).toBeEnabled({ timeout: 15_000 })
    }
    await typeGuess(host, '5678')
    // If the host moved first, the friend still gets the last move to draw; a miss ends it.
    const won = host.getByRole('heading', { name: 'Победа!' })
    const lastMove = digit(guest, '9')
    await expect(async () => {
      expect((await won.isVisible()) || (await lastMove.isEnabled().catch(() => false))).toBe(true)
    }).toPass({ timeout: 15_000 })
    if (!(await won.isVisible())) await typeGuess(guest, '9876')

    await expect(host).toHaveURL(/\/duel\/[^/]+\/result$/)
    await expect(host.getByRole('heading', { name: 'Победа!' })).toBeVisible()
    await expect(host.getByText('Неговото: 5678 · твоето: 1234', { exact: false })).toBeVisible()
    await expect(guest).toHaveURL(/\/duel\/[^/]+\/result$/)
    await expect(guest.getByRole('heading', { name: 'Загуба' })).toBeVisible()

    // Rematch: offered by the friend, accepted by the host, both are back in the room.
    await guest.getByRole('button', { name: 'Реванш' }).click()
    // The host's button turns into „Приеми“ with the time left on the offer.
    await host.getByRole('button', { name: /^Приеми/ }).click()
    await expect(host).toHaveURL(/\/duel\/[^/]+$/)
    await expect(guest).toHaveURL(/\/duel\/[^/]+$/)
  } finally {
    await guest.context().close()
  }
})

for (const level of ['Лесно', 'Средно', 'Трудно', 'Експерт'] as const) {
  test(`bot ${level}: race against the Scarecrow, won with the pinned number`, async ({ page }) => {
    await pinSecret(page, '**/api/bots', '1234')
    await guestLogin(page)
    await page.goto('/bot/new')
    await page.getByRole('button', { name: level, exact: true }).click()
    await page.getByRole('radio', { name: /Надпревара/ }).click()
    await page.getByRole('button', { name: 'Срещу Плашилото' }).click()
    await ready(page)
    await untilPlaying(page)
    await expectNoSideScroll(page)
    // Guessed at once, before even the expert bot (2–3 s a move) can finish.
    await typeGuess(page, '1234')
    await expect(page).toHaveURL(/\/duel\/[^/]+\/result$/)
    await expect(page.getByRole('heading', { name: 'Победа!' })).toBeVisible()
    await expect(page.getByText(`СРЕЩУ ПЛАШИЛОТО · ${level.toUpperCase()}`, { exact: false })).toBeVisible()
    await page.getByRole('region', { name: 'Резултат' }).getByRole('button', { name: 'Нова игра' }).click()
    await expect(page).toHaveURL(/\/(new|bot\/new|duel\/new)$/)
  })
}

test('bot classic: the Scarecrow guesses on its turns and giving up ends it as a loss', async ({ page }) => {
  await guestLogin(page)
  await page.goto('/bot/new')
  await page.getByRole('button', { name: 'Средно', exact: true }).click()
  await page.getByRole('radio', { name: /Класически/ }).click()
  await page.getByRole('button', { name: 'Срещу Плашилото' }).click()
  await ready(page)
  await hideSecret(page, '9876')
  await expect(page.getByRole('button', { name: 'Пусни стадото!' })).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Предавам се' }).click()
  await expect(page).toHaveURL(/\/duel\/[^/]+\/result$/)
  await expect(page.getByRole('heading', { name: 'Загуба' })).toBeVisible()
})
