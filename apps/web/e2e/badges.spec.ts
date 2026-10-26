import { expect, test } from '@playwright/test'
import { guestLogin } from './helpers'

/**
 * Р2/Р3 (spec B §4): the badge collection in the profile (the „Значки“ tab on phones, the right column on
 * desktop) and the detail that opens from a tile, as a bottom sheet or a modal. A guest sees everything locked.
 */

test('badges: the collection with 29 tiles, the detail from a tile on phone and desktop', async ({ page }, info) => {
  await guestLogin(page)
  const phone = info.project.name === 'mobile'
  await page.goto(phone ? '/profile?tab=badges' : '/profile')

  if (phone) {
    await expect(page.getByRole('radio', { name: 'Значки' })).toHaveAttribute('aria-checked', 'true')
  } else {
    await expect(page.getByRole('region', { name: 'Значки' })).toBeVisible()
  }
  await expect(page.getByText('Влез, за да събираш значки')).toBeVisible()
  await expect(page.locator('.bdg')).toHaveCount(29)
  await expect(page.locator('.bdg.locked')).toHaveCount(29)
  await expect(page.getByRole('button', { name: '???: не е спечелена' })).toHaveCount(3)

  const tile = page.getByRole('button', { name: 'Шерлок: не е спечелена' })
  await tile.scrollIntoViewIfNeeded()
  await tile.click()
  const dialog = page.getByRole('dialog', { name: 'Значка' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Шерлок')
  await expect(dialog).toContainText('Познато число с 4 цифри за 4 опита или по-малко')
  await expect(dialog.locator('.step')).toHaveCount(3)
  await expect(dialog.getByTestId('badge-progress')).toHaveText('0 от 1 до следващата степен')
  await expect(dialog).toContainText('+50 XP за всяка степен')
  const vp = page.viewportSize()!
  const box = (await dialog.boundingBox())!
  if (phone) {
    expect(Math.round(box.y + box.height)).toBe(vp.height)
  } else {
    expect(Math.round(box.x + box.width / 2)).toBe(Math.round(vp.width / 2))
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // Every badge is available now (the weekly one came with ЧАСТ 3): no „скоро“.
  await page.getByRole('button', { name: 'Седмичник: не е спечелена' }).click()
  await expect(page.getByRole('dialog', { name: 'Значка' })).not.toContainText('скоро')
  await page.getByRole('button', { name: 'Затвори' }).click()

  if (phone) {
    // Back to the profile tab: the badge tiles make way for the stats.
    await page.getByRole('radio', { name: 'Профил' }).click()
    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.locator('.bdg')).toHaveCount(0)
    await expect(page.getByText('игри', { exact: true })).toBeVisible()
  }
})
