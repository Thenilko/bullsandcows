import { BADGES, tierFor, badgeDef } from '@bc/game-core'
import { describe, expect, it } from 'vitest'
import {
  badgeProgress,
  completeMonths,
  EMPTY_FACTS,
  guessEvents,
  isLadder,
  longestWinRun,
  type BadgeFacts,
  type DuelFact,
  type GameFact,
} from './badgeMetrics'

const game = (over: Partial<GameFact> = {}): GameFact => ({
  kind: 'free',
  len: 4,
  zero: false,
  won: true,
  attempts: 7,
  wasted: 1,
  durationMs: 120_000,
  hourSofia: 12,
  dailyDate: null,
  usedNotes: false,
  ...over,
})

const duel = (over: Partial<DuelFact> = {}): DuelFact => ({
  vsHuman: true,
  won: true,
  botLevel: null,
  isRematch: false,
  comeback: false,
  ...over,
})

const facts = (over: Partial<BadgeFacts>): BadgeFacts => ({ ...EMPTY_FACTS, ...over })
const games = (...list: GameFact[]) => facts({ games: list })
const duels = (...list: DuelFact[]) => facts({ duels: list })

const sept = (day: number) => `2026-09-${String(day).padStart(2, '0')}`

/** A minimal positive and a minimal negative example per badge. */
const CASES: Readonly<Record<string, readonly [BadgeFacts, BadgeFacts]>> = {
  noWaste: [games(game({ wasted: 0 })), games(game({ wasted: 0, won: false }), game())],
  sherlock: [
    games(game({ len: 4, attempts: 4 })),
    games(game({ len: 4, attempts: 5 }), game({ len: 5, attempts: 4 })),
  ],
  allCows: [facts({ events: ['allCows'] }), facts({ events: ['mirror'] })],
  lucky: [
    games(game({ attempts: 2 })),
    games(game({ attempts: 3 }), game({ attempts: 1, won: false })),
  ],
  five: [games(game({ len: 5 })), games(game({ len: 4 }), game({ len: 5, won: false }))],
  pure: [
    games(game({ wasted: 0, won: false, attempts: 3 })),
    games(game({ wasted: 1 }), game({ wasted: 0, attempts: 1 }), game({ kind: 'bot', wasted: 0 })),
  ],
  underMinute: [
    games(game({ durationMs: 59_999 })),
    games(
      game({ durationMs: 60_000 }),
      game({ durationMs: null }),
      game({ durationMs: 1, won: false }),
    ),
  ],
  bolt: [games(game({ durationMs: 29_999 })), games(game({ durationMs: 30_000 }))],
  streak: [facts({ bestDayStreak: 7 }), facts({ bestDayStreak: 6 })],
  early: [
    games(game({ kind: 'daily', dailyDate: '2026-10-20', hourSofia: 7 })),
    games(
      game({ kind: 'daily', dailyDate: '2026-10-20', hourSofia: 8 }),
      game({ kind: 'free', hourSofia: 7 }),
      game({ kind: 'daily', dailyDate: '2026-10-20', hourSofia: 7, won: false }),
    ),
  ],
  night: [
    games(game({ kind: 'daily', dailyDate: '2026-10-20', hourSofia: 22 })),
    games(game({ kind: 'daily', dailyDate: '2026-10-20', hourSofia: 21 }), game({ hourSofia: 23 })),
  ],
  month: [
    games(...Array.from({ length: 30 }, (_, i) => game({ kind: 'daily', dailyDate: sept(i + 1) }))),
    games(
      ...Array.from({ length: 29 }, (_, i) => game({ kind: 'daily', dailyDate: sept(i + 1) })),
      game({ kind: 'daily', dailyDate: sept(30), won: false }),
    ),
  ],
  duelist: [duels(duel()), duels(duel({ won: false }), duel({ vsHuman: false, botLevel: 4 }))],
  unbeaten: [
    duels(duel(), duel(), duel(), duel(), duel()),
    duels(
      duel(),
      duel(),
      duel({ won: false }),
      duel(),
      duel(),
      duel(),
      duel({ vsHuman: false, botLevel: 1 }),
    ),
  ],
  comeback: [duels(duel({ comeback: true })), duels(duel({ comeback: true, won: false }))],
  rematch: [
    duels(duel({ isRematch: true, won: false })),
    duels(duel(), duel({ isRematch: true, vsHuman: false, botLevel: 2 })),
  ],
  bot1: [
    duels(duel({ vsHuman: false, botLevel: 1 })),
    duels(duel({ vsHuman: false, botLevel: 2 })),
  ],
  bot2: [
    duels(duel({ vsHuman: false, botLevel: 2 })),
    duels(duel({ vsHuman: false, botLevel: 2, won: false })),
  ],
  bot3: [
    duels(duel({ vsHuman: false, botLevel: 3 })),
    duels(duel({ vsHuman: false, botLevel: 4 })),
  ],
  bot4: [duels(duel({ vsHuman: false, botLevel: 4 })), duels(duel({ botLevel: 4 }))],
  formats: [
    games(
      game({ len: 3 }),
      game({ len: 3, zero: true }),
      game({ len: 4 }),
      game({ len: 4, zero: true, kind: 'bot' }),
      game({ len: 5 }),
      game({ len: 5, zero: true, kind: 'duel_race' }),
    ),
    games(game({ len: 3 }), game({ len: 4 }), game({ len: 5 }), game({ len: 3 })),
  ],
  notes: [
    games(...Array.from({ length: 10 }, () => game({ usedNotes: true, won: false }))),
    games(...Array.from({ length: 9 }, () => game({ usedNotes: true })), game()),
  ],
  teller: [facts({ shares: 5 }), facts({ shares: 4 })],
  invite: [facts({ farmInvitees: ['u2'] }), duels(duel({ invitee: null }))],
  family: [facts({ inFarm: true }), facts({ inFarm: false, farmInvitees: ['u2'] })],
  mirror: [facts({ events: ['mirror'] }), facts({ events: ['allCows'] })],
  ladder: [facts({ events: ['ladder'] }), EMPTY_FACTS],
  zeroHero: [facts({ events: ['zeroHero'] }), EMPTY_FACTS],
}

describe('badgeProgress', () => {
  it('has a positive and a negative example for every available badge', () => {
    for (const def of BADGES.filter((b) => b.available)) {
      const pair = CASES[def.key]
      expect(pair, def.key).toBeDefined()
      const [yes, no] = pair!
      expect(tierFor(def, badgeProgress(def.key, yes)), `${def.key} positive`).toBeGreaterThan(0)
      expect(tierFor(def, badgeProgress(def.key, no)), `${def.key} negative`).toBe(0)
    }
  })

  it('stays at zero for the badges that are not available yet, whatever the facts', () => {
    const rich = facts({
      shares: 999,
      bestDayStreak: 999,
      games: [game()],
      duels: [duel()],
      farmInvitees: ['x'],
      inFarm: true,
    })
    for (const def of BADGES.filter((b) => !b.available)) {
      expect(badgeProgress(def.key, rich), def.key).toBe(0)
    }
  })

  it('counts invited people once, from farm joins and duel invites together', () => {
    const f = facts({
      farmInvitees: ['a', 'b'],
      duels: [duel({ invitee: 'b' }), duel({ invitee: 'c' }), duel({ invitee: null })],
    })
    expect(badgeProgress('invite', f)).toBe(3)
  })

  it('counts, so the tiers come from the thresholds', () => {
    const tenClean = games(...Array.from({ length: 10 }, () => game({ wasted: 0 })))
    expect(badgeProgress('noWaste', tenClean)).toBe(10)
    expect(tierFor(badgeDef('noWaste'), 10)).toBe(2)
    expect(
      badgeProgress('notes', games(game({ usedNotes: true }), game({ usedNotes: true }))),
    ).toBe(2)
    expect(badgeProgress('formats', CASES.formats![1])).toBe(3)
    expect(badgeProgress('streak', facts({ bestDayStreak: 31 }))).toBe(31)
  })

  it('measures the longest duel win run against humans only, in order', () => {
    expect(longestWinRun([true, true, false, true, true, true])).toBe(3)
    expect(longestWinRun([])).toBe(0)
    const mixed = duels(
      duel(),
      duel({ vsHuman: false, botLevel: 3, won: false }),
      duel(),
      duel({ won: false }),
      duel(),
    )
    expect(badgeProgress('unbeaten', mixed)).toBe(2)
  })

  it('needs every day of a calendar month, in Sofia dates', () => {
    expect(completeMonths([])).toEqual([])
    const feb = Array.from({ length: 28 }, (_, i) => `2027-02-${String(i + 1).padStart(2, '0')}`)
    expect(completeMonths(feb)).toEqual(['2027-02'])
    expect(completeMonths(feb.slice(1))).toEqual([])
    expect(completeMonths([...feb, ...feb, '2027-03-01'])).toEqual(['2027-02'])
  })
})

describe('guessEvents', () => {
  const g = (guess: string, bulls: number, cows: number) => ({ guess, bulls, cows })

  it('sees all cows, the mirror, a ladder and a leading zero', () => {
    expect(guessEvents('1234', [g('4321', 0, 4)], 4, true)).toEqual(['allCows', 'mirror', 'ladder'])
    expect(guessEvents('0987', [g('0987', 4, 0)], 4, true)).toEqual(['zeroHero'])
    expect(guessEvents('0123', [g('0123', 4, 0)], 4, true)).toEqual(['ladder', 'zeroHero'])
  })

  it('sees nothing in an ordinary game, and no ladder or zero hero without a win', () => {
    expect(guessEvents('1324', [g('3142', 0, 4)], 4, true)).toEqual(['allCows'])
    expect(guessEvents('1234', [g('5678', 0, 0)], 4, false)).toEqual([])
    expect(guessEvents('0123', [g('5678', 0, 0)], 4, false)).toEqual([])
    expect(guessEvents('1234', [g('1243', 2, 2)], 4, true)).toEqual(['ladder'])
    expect(guessEvents('1324', [g('1324', 4, 0)], 4, true)).toEqual([])
  })

  it('knows a ladder in both directions and any length', () => {
    expect(['123', '321', '56789', '98765', '0123'].every(isLadder)).toBe(true)
    expect(['124', '1324', '1357', '2109'].some(isLadder)).toBe(false)
  })
})
