import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { meFixture } from '../../test/fixtures'
import { renderRoute } from '../../test/renderRoute'

const get = vi.fn()
vi.mock('./client', () => ({
  api: { get: (p: string) => get(p), patch: vi.fn(), post: vi.fn() },
}))

const { GuestStreakCard, STREAK_DISMISSED_KEY, shouldWarnStreak } =
  await import('./GuestStreakCard')

const guest = (dayStreak: number) => ({
  ...meFixture,
  dayStreak,
  profile: { ...meFixture.profile, isGuest: true },
})

function show() {
  return renderRoute(<GuestStreakCard />, { path: '/new', at: '/new' })
}

beforeEach(() => {
  get.mockReset()
  sessionStorage.clear()
})

describe('GuestStreakCard', () => {
  it('warns a guest with a live streak of three days or more', async () => {
    get.mockResolvedValue(guest(4))
    show()
    expect(
      await screen.findByText(
        'Серия 4 дни! Като гост я губиш, ако смениш телефона или изчистиш браузъра — запази я с профил.',
      ),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Направи си профил' }))
    expect(screen.getByRole('form', { name: 'Направи си профил' })).toBeInTheDocument()
  })

  it('applies the rule: guests only, from three days, a missing streak is none', () => {
    expect(shouldWarnStreak(guest(3))).toBe(true)
    expect(shouldWarnStreak(guest(2))).toBe(false)
    expect(shouldWarnStreak({ ...guest(9), profile: { isGuest: false } })).toBe(false)
    expect(shouldWarnStreak({ profile: { isGuest: true } })).toBe(false)
  })

  it('stays away from short streaks and hides for the session after „По-късно“', async () => {
    get.mockResolvedValueOnce(guest(2))
    const first = show()
    await vi.waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByRole('complementary')).toBeNull()
    first.unmount()
    get.mockResolvedValue(guest(5))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'По-късно' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(sessionStorage.getItem(STREAK_DISMISSED_KEY)).toBe('1')
  })
})
