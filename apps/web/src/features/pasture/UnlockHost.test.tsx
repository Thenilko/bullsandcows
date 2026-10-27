import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pastureUnlockFixture } from '../../dev/pastureFixtures'
import { renderWithI18n } from '../../test/render'
import { useBadgeToasts } from '../badges/toastStore'
import { useUnlocks } from './unlockStore'

const get = vi.fn()
const patch = vi.fn()
vi.mock('../auth/client', () => ({
  api: { get: (p: string) => get(p), patch: (p: string, b: unknown) => patch(p, b), post: vi.fn() },
}))

const { UnlockHost } = await import('./UnlockHost')

beforeEach(() => {
  get.mockReset()
  patch.mockReset()
  get.mockResolvedValue(pastureUnlockFixture)
  patch.mockResolvedValue(pastureUnlockFixture)
  useUnlocks.setState({ queue: [] })
  useBadgeToasts.setState({ queue: [], shown: 0 })
})

describe('UnlockHost (П2)', () => {
  it('waits for the badge toasts, then shows the new reward with the next one', () => {
    renderWithI18n(<UnlockHost onOpenPasture={vi.fn()} />)
    act(() => {
      useBadgeToasts.getState().push([{ key: 'sherlock', tier: 1 }])
      useUnlocks.getState().push(['windmill'])
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => useBadgeToasts.getState().next())
    const dialog = screen.getByRole('dialog', { name: 'Ново в пасището' })
    expect(dialog).toHaveTextContent('Ниво 15 · ново в пасището')
    expect(dialog).toHaveTextContent('Вятърна мелница')
    expect(dialog).toHaveTextContent('Следващата награда: Езерце с патици на ниво 20.')
    expect(screen.getByRole('button', { name: 'Сложи я в пасището' })).toBeInTheDocument()
  })

  it('„По-късно“ hides the reward until switched on; the next one follows', async () => {
    renderWithI18n(<UnlockHost onOpenPasture={vi.fn()} />)
    act(() => useUnlocks.getState().push(['windmill', 'beehive']))
    fireEvent.click(screen.getByRole('button', { name: 'По-късно' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/me/pasture', { hiddenItems: ['windmill'] }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Значка „Ранобудник“ · ново в пасището')
  })

  it('„Сложи го“ keeps a shown reward as it is; the barn colour leads to the pasture', async () => {
    const open = vi.fn()
    renderWithI18n(<UnlockHost onOpenPasture={open} />)
    act(() => useUnlocks.getState().push(['windmill', 'barnColor']))
    fireEvent.click(screen.getByRole('button', { name: 'Сложи я в пасището' }))
    fireEvent.click(screen.getByRole('button', { name: 'Избери цвят' }))
    expect(open).toHaveBeenCalledOnce()
    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(patch).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
