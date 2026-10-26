import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { guestLogin, pinSecret, typeGuess, untilPlaying } from './helpers'

/**
 * Р1 „Сподели резултата“ (spec A): the sheet opens from the solo result on phones (390×844 and 390×660) and as a
 * modal on desktop (1440×900 and 1280×768); without `navigator.share` the actions copy the text; the picture
 * downloads as a 1080×1080 PNG.
 */

const SECRET = '1234'
const WRONG = '5678'
const PNG_SIDE = 1080
const HEADER = 'Бикове и крави · Свободна игра · 4 цифри · 2 опита'

/** No native share; the clipboard keeps what was written on `window.__copied`. */
async function stubShareApis(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          ;(window as unknown as { __copied?: string }).__copied = text
          return Promise.resolve()
        },
      },
    })
  })
}

const copied = (page: Page) => page.evaluate(() => (window as unknown as { __copied?: string }).__copied ?? null)

/** PNG: 8 signature bytes, then the IHDR chunk whose data starts with width and height (big-endian). */
function pngSize(bytes: Buffer): [number, number] {
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR')
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]
}

async function playToTheWin(page: Page) {
  await pinSecret(page, '**/api/games', SECRET)
  await guestLogin(page)
  await page.getByRole('button', { name: '4', exact: true }).click()
  await page.getByRole('button', { name: 'Свободно' }).click()
  await page.getByRole('button', { name: 'Старт', exact: true }).click()
  await page.getByRole('button', { name: 'Старт', exact: true }).click()
  await untilPlaying(page)
  await typeGuess(page, WRONG)
  await typeGuess(page, SECRET)
  await expect(page).toHaveURL(/\/result\/[^/]+$/)
}

async function openSheet(page: Page) {
  await page.getByRole('button', { name: 'Сподели', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Сподели резултата' })
  await expect(sheet).toBeVisible()
  return sheet
}

async function expectInViewport(page: Page, box: { x: number; y: number; width: number; height: number } | null) {
  const vp = page.viewportSize()!
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 0.5)
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 0.5)
}

test('share sheet: opens over the result at every size, copies the text without navigator.share, downloads a 1080×1080 PNG', async ({ page }, info) => {
  await stubShareApis(page)
  await playToTheWin(page)

  const phone = info.project.name === 'mobile'
  const sizes: [number, number][] = phone
    ? [
        [390, 844],
        [390, 660],
      ]
    : [
        [1440, 900],
        [1280, 768],
      ]

  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    const sheet = await openSheet(page)
    await expect(sheet.getByTestId('share-card')).toBeVisible()
    await expect(sheet.getByTestId('share-text')).toHaveText(new RegExp(`^${HEADER}`))
    await expect(sheet.getByTestId('share-text')).toContainText('Можеш ли по-добре? · ')
    await expect(sheet.getByTestId('share-text')).toContainText('/?s=share')
    await expect(sheet.getByRole('button', { name: 'Сподели…' })).toBeVisible()
    await expectInViewport(page, await sheet.boundingBox())
    if (phone) {
      // A bottom sheet: it ends at the bottom edge and leaves the scene showing above.
      const box = (await sheet.boundingBox())!
      expect(Math.round(box.y + box.height)).toBe(height)
      expect(box.y).toBeGreaterThan(0)
    } else {
      // A centred modal above the result modal.
      const box = (await sheet.boundingBox())!
      expect(Math.round(box.x + box.width / 2)).toBe(Math.round(width / 2))
      expect(box.width).toBeLessThan(width)
    }
    await sheet.getByRole('button', { name: 'Затвори' }).click()
    await expect(sheet).toBeHidden()
  }

  // The fallback without navigator.share: „Сподели…“ copies, so does „Копирай текста“; the toast confirms.
  const sheet = await openSheet(page)
  const text = (await sheet.getByTestId('share-text').textContent()) ?? ''
  await sheet.getByRole('button', { name: 'Сподели…' }).click()
  await expect(sheet.getByTestId('share-notice')).toHaveText('Копирано!')
  expect(await copied(page)).toBe(text)
  expect(text.split('\n')).toHaveLength(4)
  expect(text.split('\n')[1]).toBe('⬜⬜⬜⬜')
  expect(text.split('\n')[2]).toBe('🐂🐂🐂🐂')
  await page.evaluate(() => {
    ;(window as unknown as { __copied?: string }).__copied = undefined
  })
  await sheet.getByRole('button', { name: 'Копирай текста' }).click()
  await expect(sheet.getByTestId('share-notice')).toHaveText('Копирано!')
  expect(await copied(page)).toBe(text)

  // The picture: a real PNG, 1080×1080, under the free-game name.
  const downloadPromise = page.waitForEvent('download')
  await sheet.getByRole('button', { name: 'Запази картинката' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('bikove-i-kravi-svobodna.png')
  const path = await download.path()
  expect(path).not.toBeNull()
  const [w, h] = pngSize(await readFile(path!))
  expect([w, h]).toEqual([PNG_SIDE, PNG_SIDE])
  await expect(sheet.getByTestId('share-notice')).toHaveText('Запазено!')
})
