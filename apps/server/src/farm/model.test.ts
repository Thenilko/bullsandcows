import { describe, expect, it } from 'vitest'
import type { PublicGameRow } from '../ports/repo'
import { bestToday, compareToday, mayDo, weekMonday, weekPoints } from './model'

const game = (over: Partial<PublicGameRow>): PublicGameRow => ({
  id: crypto.randomUUID(),
  userId: 'u',
  kind: 'daily',
  len: 4,
  zero: false,
  dailyDate: '2026-10-26',
  practice: false,
  startedAt: 0,
  finishedAt: 60_000,
  attempts: 5,
  wasted: 0,
  won: true,
  score: 100,
  suspicious: false,
  usedNotes: false,
  createdAt: 0,
  ...over,
})

describe('farm model', () => {
  it('finds the Monday of a Sofia date, across the end of October', () => {
    expect(weekMonday('2026-10-26')).toBe('2026-10-26')
    expect(weekMonday('2026-11-01')).toBe('2026-10-26')
    expect(weekMonday('2026-10-25')).toBe('2026-10-19')
  })

  it('ranks a win before a loss, then fewer attempts, then less time', () => {
    const win5 = { won: true, attempts: 5, secs: 30 }
    const win4 = { won: true, attempts: 4, secs: 90 }
    const win4fast = { won: true, attempts: 4, secs: 50 }
    const loss = { won: false, attempts: 3, secs: 10 }
    expect([loss, win5, win4, win4fast].sort(compareToday)).toEqual([win4fast, win4, win5, loss])
  })

  it('takes the best finished game of the day and ignores unfinished ones', () => {
    const games = [
      game({ attempts: 6 }),
      game({ attempts: 3, finishedAt: null }),
      game({ attempts: 4, dailyDate: '2026-10-25' }),
    ]
    expect(bestToday(games, '2026-10-26')).toEqual({ attempts: 6, secs: 60, won: true })
    expect(bestToday([], '2026-10-26')).toBeNull()
  })

  it('sums the week from Monday', () => {
    const games = [
      game({ score: 100, dailyDate: '2026-10-26' }),
      game({ score: 50, dailyDate: '2026-10-28' }),
      game({ score: 999, dailyDate: '2026-10-25' }),
    ]
    expect(weekPoints(games, '2026-10-26')).toBe(150)
  })

  it('gives the owner every action and a member only view, nudge and leave', () => {
    for (const a of ['rename', 'newCode', 'remove', 'leave', 'nudge', 'view'] as const) {
      expect(mayDo('owner', a)).toBe(true)
    }
    expect(mayDo('member', 'view')).toBe(true)
    expect(mayDo('member', 'nudge')).toBe(true)
    expect(mayDo('member', 'leave')).toBe(true)
    expect(mayDo('member', 'rename')).toBe(false)
    expect(mayDo('member', 'newCode')).toBe(false)
    expect(mayDo('member', 'remove')).toBe(false)
  })
})
