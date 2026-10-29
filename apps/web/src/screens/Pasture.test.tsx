import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pastureFixture, pastureFullFixture, pastureView } from '../dev/pastureFixtures'
import { useSession } from '../features/auth/session'
import { renderRoute } from '../test/renderRoute'
import { IMMERSIVE, mockViewport, resetViewport } from '../test/viewport'

const get = vi.fn()
const patch = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: { get: (p: string) => get(p), patch: (p: string, b: unknown) => patch(p, b), post: vi.fn() },
}))

const { Pasture } = await import('./Pasture')

const show = () => renderRoute(<Pasture />, { path: '/profile/pasture', at: '/profile/pasture' })

beforeEach(() => {
  get.mockReset()
  patch.mockReset()
  get.mockResolvedValue(pastureFixture)
  useSession.setState({ session: { accessToken: 't', refreshToken: '', expiresAt: 0, user: { id: 'u1', isGuest: false } }, me: null })
})

afterEach(() => resetViewport())

describe('Pasture (Р6)', () => {
  it('lists the rewards: switches for the unlocked ones, „заключено“ and progress for the rest', async () => {
    show()
    const list = await screen.findByRole('list', { name: 'Награди в пасището' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(8)
    expect(screen.getByText('3 от 9')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Покажи: Кученце Шаро' })).toHaveAttribute('aria-checked', 'true')
    const rooster = list.querySelector('[data-item="rooster"]') as HTMLElement
    expect(rooster).toHaveTextContent('серия 30 дни · 9 / 30')
    expect(rooster).toHaveTextContent('заключено')
    expect(list.querySelector('[data-item="windmill"]')).toHaveTextContent('ниво 15 · 12 / 15')
    expect(screen.getByText('Твоето пасище', { selector: '.ps-hud' })).toBeInTheDocument()
    expect(screen.getByText('ниво 12', { selector: '.ps-hud' })).toBeInTheDocument()
  })

  it('draws the shown rewards in the scene and hides one when switched off (saved)', async () => {
    patch.mockImplementation(async (_p: string, body: { hiddenItems: string[] }) => pastureView({ level: 12, badges: { early: { tier: 1, progress: 6 } } }, 'red', body.hiddenItems as never))
    const { container } = show()
    const dog = await screen.findByRole('switch', { name: 'Покажи: Кученце Шаро' })
    expect(container.querySelector('[data-reward="dog"]')).not.toBeNull()
    fireEvent.click(dog)
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/me/pasture', { hiddenItems: ['dog'] }))
    await waitFor(() => expect(container.querySelector('[data-reward="dog"]')).toBeNull())
    expect(screen.getByRole('switch', { name: 'Покажи: Кученце Шаро' })).toHaveAttribute('aria-checked', 'false')
  })

  it('opens a locked reward: the drawing, what it is, how to unlock it and the progress', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Виж наградата: Вятърна мелница' }))
    const detail = await screen.findByRole('dialog', { name: 'Награда: Вятърна мелница' })
    expect(detail.querySelector('[data-reward-icon="windmill"]')).not.toBeNull()
    expect(detail).toHaveTextContent('Върти се, докато мъглата се вдига.')
    expect(detail).toHaveTextContent('Как се отключва: ниво 15')
    expect(within(detail).getByTestId('reward-progress')).toHaveTextContent('12 / 15')
    expect(within(detail).queryByRole('button', { name: 'Скрий от пасището' })).toBeNull()
    fireEvent.click(within(detail).getByRole('button', { name: 'Затвори' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('hides an unlocked reward from its detail (saved)', async () => {
    patch.mockImplementation(async (_p: string, body: { hiddenItems: string[] }) => pastureView({ level: 12, badges: { early: { tier: 1, progress: 6 } } }, 'red', body.hiddenItems as never))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Виж наградата: Кученце Шаро' }))
    const detail = await screen.findByRole('dialog', { name: 'Награда: Кученце Шаро' })
    expect(detail).toHaveTextContent('Отключено')
    fireEvent.click(within(detail).getByRole('button', { name: 'Скрий от пасището' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/me/pasture', { hiddenItems: ['dog'] }))
    expect(await within(detail).findByRole('button', { name: 'Покажи в пасището' })).toBeInTheDocument()
  })

  it('opens the barn colour from its card', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Виж наградата: Цвят на обора' }))
    const detail = await screen.findByRole('dialog', { name: 'Награда: Цвят на обора' })
    expect(detail).toHaveTextContent('Как се отключва: ниво 25')
  })

  it('keeps the colours locked before level 25', async () => {
    show()
    const blue = await screen.findByRole('radio', { name: 'Цвят на обора: син' })
    expect(blue).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Цвят на обора: червен' })).toHaveAttribute('aria-checked', 'true')
  })

  it('shows „Всичко отключено“ and repaints the barn (П1)', async () => {
    get.mockResolvedValue(pastureFullFixture)
    patch.mockResolvedValue({ ...pastureFullFixture, barnColor: 'green' })
    const { container } = show()
    expect(await screen.findByText('Всичко отключено')).toBeInTheDocument()
    expect(screen.getByText(/Оборът е боядисан в синьо/)).toBeInTheDocument()
    expect(screen.getByText('ниво 38 · Главен бик', { selector: '.ps-hud' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Цвят на обора: зелен' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/me/pasture', { barnColor: 'green' }))
    await waitFor(() => expect(container.querySelector('[data-reward="barnColor"]')?.getAttribute('fill')).toBe('#5E9E46'))
  })

  it('restores the view and says so when a save fails', async () => {
    patch.mockRejectedValue(new Error('boom'))
    show()
    fireEvent.click(await screen.findByRole('switch', { name: 'Покажи: Слънчогледи' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не успяхме да запазим')
    expect(screen.getByRole('switch', { name: 'Покажи: Слънчогледи' })).toHaveAttribute('aria-checked', 'true')
  })

  it('on desktop: the title in the narrow panel (ПД1)', async () => {
    mockViewport(...IMMERSIVE)
    const { container } = show()
    expect(await screen.findByRole('heading', { level: 1, name: 'Твоето пасище' })).toBeVisible()
    expect(container.querySelector('.dk.sc-pasture.dk-imm')).not.toBeNull()
  })
})
