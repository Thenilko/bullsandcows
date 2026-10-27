import { describe, expect, it } from 'vitest'
import type { WeeklyPlayEntry } from '../ports/repo'
import { hasGoldFrame, resultsOf, standings } from './model'

let n = 0
const play = (
  over: Partial<WeeklyPlayEntry> & Pick<WeeklyPlayEntry, 'userId'>,
): WeeklyPlayEntry => {
  n += 1
  return {
    weekId: '2026-W44',
    day: '2026-10-26',
    gameId: `g${n}`,
    attempts: 6,
    secs: 100,
    won: true,
    finishedAt: 1_000 + n,
    createdAt: 0,
    username: over.userId,
    xp: 0,
    avatarSpecies: 'bull',
    goldFrameUntil: null,
    ...over,
  }
}

describe('standings', () => {
  it('ranks each player by their best game: a win, then fewer attempts, then less time', () => {
    const s = standings([
      play({ userId: 'a', attempts: 5, secs: 200 }),
      play({ userId: 'b', attempts: 5, secs: 90 }),
      play({ userId: 'c', attempts: 4, secs: 300 }),
      play({ userId: 'd', won: false, attempts: 2, secs: 10 }),
    ])
    expect(s.ranked.map((p) => [p.entry.userId, p.place])).toEqual([
      ['c', 1],
      ['b', 2],
      ['a', 3],
    ])
    expect(s.participants).toBe(4)
  })

  it('counts the best game of a player and never lets a loss improve the place', () => {
    const s = standings([
      play({ userId: 'a', attempts: 7, secs: 50 }),
      play({ userId: 'a', won: false, attempts: 1, secs: 5 }),
      play({ userId: 'a', attempts: 6, secs: 400 }),
      play({ userId: 'b', attempts: 6, secs: 300 }),
    ])
    expect(s.best.get('a')).toMatchObject({ won: true, attempts: 6, secs: 400 })
    expect(s.ranked.map((p) => p.entry.userId)).toEqual(['b', 'a'])
  })

  it('leaves players without a win unranked but counts them', () => {
    const s = standings([play({ userId: 'x', won: false }), play({ userId: 'y', won: false })])
    expect(s.ranked).toEqual([])
    expect(s.participants).toBe(2)
  })

  it('ignores unfinished games', () => {
    const s = standings([play({ userId: 'a', finishedAt: null })])
    expect(s.participants).toBe(0)
  })

  it('breaks full ties by the earlier finish', () => {
    const s = standings([
      play({ userId: 'late', finishedAt: 9_000 }),
      play({ userId: 'early', finishedAt: 2_000 }),
    ])
    expect(s.ranked.map((p) => p.entry.userId)).toEqual(['early', 'late'])
  })
})

describe('resultsOf', () => {
  it('pays 300 XP for a win, the gold frame to the top 10 only, nothing for a loss', () => {
    const plays = Array.from({ length: 12 }, (_, i) =>
      play({ userId: `u${String(i).padStart(2, '0')}`, attempts: 3 + i }),
    )
    const results = resultsOf(
      standings([...plays, play({ userId: 'loser', won: false })]),
      '2026-W44',
    )
    const by = new Map(results.map((r) => [r.userId, r]))
    expect(by.get('u00')).toMatchObject({ place: 1, xp: 300, goldFrame: true, participants: 13 })
    expect(by.get('u09')).toMatchObject({ place: 10, goldFrame: true })
    expect(by.get('u10')).toMatchObject({ place: 11, goldFrame: false, xp: 300 })
    expect(by.get('loser')).toMatchObject({
      place: null,
      xp: 0,
      goldFrame: false,
      won: false,
      attempts: null,
    })
  })
})

describe('hasGoldFrame', () => {
  it('is active until the moment it ends', () => {
    expect(hasGoldFrame(null, 5)).toBe(false)
    expect(hasGoldFrame(10, 5)).toBe(true)
    expect(hasGoldFrame(10, 10)).toBe(false)
  })
})
