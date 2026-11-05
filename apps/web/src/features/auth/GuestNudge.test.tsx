import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { meFixture } from '../../test/fixtures'
import { renderRoute } from '../../test/renderRoute'

const get = vi.fn()
vi.mock('./client', () => ({
  api: { get: (p: string) => get(p), patch: vi.fn(), post: vi.fn() },
}))

const { GuestNudge, NUDGE_DISMISSED_KEY } = await import('./GuestNudge')

const guest = (played: number) => ({
  ...meFixture,
  xp: 420,
  profile: { ...meFixture.profile, isGuest: true },
  stats: { ...meFixture.stats, played },
})

function show() {
  return renderRoute(<GuestNudge />, { path: '/result/:id', at: '/result/g1' })
}

beforeEach(() => {
  get.mockReset()
  sessionStorage.clear()
})

describe('GuestNudge', () => {
  it('asks a guest with more than five games to keep their points', async () => {
    get.mockResolvedValue(guest(6))
    show()
    expect(await screen.findByText('Изигра 6 игри като гост')).toBeInTheDocument()
    expect(screen.getByText(/всичките си 420 точки/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Направи си профил' }))
    expect(screen.getByRole('form', { name: 'Направи си профил' })).toBeInTheDocument()
  })

  it('stays away from new guests and registered players', async () => {
    get.mockResolvedValueOnce(guest(5))
    const first = show()
    await vi.waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByRole('complementary')).toBeNull()
    first.unmount()
    get.mockResolvedValue({ ...meFixture, stats: { ...meFixture.stats, played: 40 } })
    show()
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('hides for the rest of the session after „По-късно“', async () => {
    get.mockResolvedValue(guest(9))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'По-късно' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(sessionStorage.getItem(NUDGE_DISMISSED_KEY)).toBe('1')
  })
})
