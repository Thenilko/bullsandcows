import { expect, test } from '@playwright/test'
import { guestLogin, newPlayer, pinSecret, typeGuess, untilPlaying } from './helpers'

const SECRET = '1234'
const WRONG = '5678'

test('friend duel: invite, join, race to the win, reconnect after reload', async ({ page: host, browser }, info) => {
  await pinSecret(host, '**/api/duels/invites', SECRET)
  const guest = await newPlayer(browser, info)
  try {

    // A: guest → duel setup → friend invite → the waiting screen shows the code.
    await guestLogin(host)
    await host.getByRole('button', { name: /^Дуел/ }).click()
    await expect(host).toHaveURL(/\/duel\/new$/)
    await expect(host.getByRole('radio', { name: /Покани приятел/ })).toHaveAttribute('aria-checked', 'true')
    await host.getByRole('button', { name: 'Създай покана' }).click()
    await expect(host).toHaveURL(/\/duel\/invite\/[A-Z0-9]{5}$/)
    const code = host.url().split('/').pop()!
    await expect(host.getByText(code, { exact: true })).toBeVisible()

    // B: guest → duel setup → types the code (lower case is fine) → the invite page → join.
    await guestLogin(guest)
    await guest.getByRole('button', { name: /^Дуел/ }).click()
    await guest.getByLabel('Имаш код от приятел?').fill(code.toLowerCase())
    await guest.getByRole('button', { name: 'Влез' }).click()
    await expect(guest).toHaveURL(new RegExp(`/d/${code}$`))
    await guest.getByRole('button', { name: 'Присъедини се' }).click()

    // Both land in the room lobby and get ready.
    for (const p of [host, guest]) {
      await expect(p).toHaveURL(/\/duel\/[^/]+$/)
      await p.getByRole('button', { name: 'Готов!' }).click()
    }
    await untilPlaying(host)
    await untilPlaying(guest)
    const roomUrl = guest.url()

    await typeGuess(host, WRONG)
    await expect(guest.getByText('опит 1 ·', { exact: false })).toBeVisible()

    // B reloads mid-game: the room session (`bc.room`) reconnects to the same duel.
    await guest.reload()
    await expect(guest).toHaveURL(roomUrl)
    await expect(guest.getByRole('button', { name: 'Предавам се' })).toBeEnabled()
    await expect(guest.getByText('опит 1 ·', { exact: false })).toBeVisible()

    await typeGuess(host, SECRET)
    await expect(host).toHaveURL(/\/duel\/[^/]+\/result$/)
    await expect(host.getByRole('heading', { name: 'Победа!' })).toBeVisible()
    await expect(host.getByText(`Числото беше ${SECRET} · +120 т. опит`)).toBeVisible()

    await expect(guest).toHaveURL(/\/duel\/[^/]+\/result$/)
    await expect(guest.getByRole('heading', { name: 'Загуба' })).toBeVisible()
    await expect(guest.getByText(`Числото беше ${SECRET}`, { exact: false })).toBeVisible()
  } finally {
    // Closed even when an expectation fails, so a failing run never leaks the second context.
    await guest.context().close()
  }
})
