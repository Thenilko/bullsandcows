import { dailySecret, sofiaDate, xpForLevel } from '@bc/game-core'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRepo } from '../adapters/repo/memory'
import type { AuthUser } from '../ports/auth'
import type { Repo } from '../ports/repo'
import { SoloError, SoloService } from './service'

const SALT = 'test-daily-salt-0123456789'
const DAY_MS = 86_400_000
const START = Date.parse('2026-10-20T09:00:00Z')

let now = START
const clock = { now: () => now }
let repo: Repo
let solo: SoloService

const alice: AuthUser = { id: 'alice', isGuest: false }
const bob: AuthUser = { id: 'bob', isGuest: false }

beforeEach(() => {
  now = START
  repo = createMemoryRepo(clock)
  solo = new SoloService({ repo, clock, dailySalt: SALT })
})

const daily = (user = alice, len: 3 | 4 | 5 = 4, zero = false) =>
  solo.create(user, { len, zero, kind: 'daily' })

const free = (secret: string, user = alice) =>
  solo.create(user, { len: 4, zero: false, kind: 'free', secretOverride: secret })

const BADGE_XP = 50
const tiersOf = async (id: string) => (await repo.badges.listOf(id)).reduce((n, b) => n + b.tier, 0)
/** XP from games alone: the profile's xp minus what badge tiers paid (+50 each). */
async function gameXp(id = 'alice'): Promise<number> {
  const xp = (await repo.profiles.get(id))?.xp ?? 0
  return xp - BADGE_XP * (await tiersOf(id))
}
const held = async (id = 'alice') =>
  (await repo.badges.listOf(id)).filter((b) => b.tier > 0).map((b) => b.key)

const codeOf = async (action: Promise<unknown>) =>
  action.then(
    () => null,
    (err: unknown) => (err instanceof SoloError ? err.code : 'other'),
  )

describe('create', () => {
  it('makes the second daily game of the day a practice game', async () => {
    const first = await daily()
    expect(first.practice).toBe(false)
    await solo.giveUp(alice, first.id)
    const second = await daily()
    expect(second.practice).toBe(true)
    expect((await daily(bob)).practice).toBe(false)
  })

  it('resumes an unfinished counted daily game instead of creating another', async () => {
    const first = await daily()
    const again = await daily()
    expect(again.id).toBe(first.id)
    expect(again.practice).toBe(false)
  })

  it('records the daily number for the date and settings', async () => {
    const calls: unknown[][] = []
    const original = repo.games.recordDailyNumber
    const spied: Repo = {
      ...repo,
      games: {
        ...repo.games,
        recordDailyNumber: (...args) => {
          calls.push(args)
          return original(...args)
        },
      },
    }
    const svc = new SoloService({ repo: spied, clock, dailySalt: SALT })
    await svc.create(alice, { len: 4, zero: false, kind: 'daily' })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.slice(0, 3)).toEqual([sofiaDate(new Date(START)), 4, false])
    expect(calls[0]?.[3]).toBeTypeOf('number')
  })

  it('uses a different number on the next Sofia day', async () => {
    const first = await daily()
    const firstSecret = (await solo.giveUp(alice, first.id)).secret
    now += DAY_MS
    const next = await daily()
    expect(next.practice).toBe(false)
    expect((await solo.giveUp(alice, next.id)).secret).not.toBe(firstSecret)
  })

  it('gives every player the same daily number', async () => {
    const a = await solo.giveUp(alice, (await daily(alice)).id)
    const b = await solo.giveUp(bob, (await daily(bob)).id)
    expect(a.secret).toBe(b.secret)
    expect(a.secret).toBe(dailySecret(SALT, sofiaDate(new Date(START)), 4, false))
  })

  it('creates a free game with a valid random secret', async () => {
    const game = await solo.create(alice, { len: 5, zero: true, kind: 'free' })
    expect(game).toMatchObject({ kind: 'free', len: 5, practice: false, total: 30240 })
    const { secret } = await solo.giveUp(alice, game.id)
    expect(secret).toMatch(/^\d{5}$/)
    expect(new Set(secret).size).toBe(5)
  })

  it('ignores a secret override for daily games and rejects an invalid one', async () => {
    const game = await solo.create(alice, {
      len: 4,
      zero: false,
      kind: 'daily',
      secretOverride: '1234',
    })
    const date = sofiaDate(new Date(START))
    expect((await solo.giveUp(alice, game.id)).secret).toBe(dailySecret(SALT, date, 4, false))
    expect(await codeOf(free('0123'))).toBe('ERR_CODE')
  })
})

describe('guess', () => {
  it('validates state and code', async () => {
    const game = await free('1234')
    expect(await codeOf(solo.guess(alice, game.id, '5678'))).toBe('ERR_NOT_STARTED')
    await solo.start(alice, game.id)
    expect(await codeOf(solo.guess(alice, game.id, '1123'))).toBe('ERR_CODE')
    expect(await codeOf(solo.guess(alice, game.id, '0123'))).toBe('ERR_CODE')
    expect(await codeOf(solo.guess(alice, game.id, '12'))).toBe('ERR_CODE')
    await solo.guess(alice, game.id, '5678')
    expect(await codeOf(solo.guess(alice, game.id, '5678'))).toBe('ERR_REPEAT')
  })

  it('start is idempotent', async () => {
    const game = await free('1234')
    const first = await solo.start(alice, game.id)
    now += 5_000
    expect(await solo.start(alice, game.id)).toEqual(first)
  })

  it('computes left and consistent on the server', async () => {
    const game = await free('5678')
    await solo.start(alice, game.id)
    const first = await solo.guess(alice, game.id, '1234')
    expect(first).toMatchObject({ bulls: 0, cows: 0, left: 120, consistent: true, solved: false })
    const second = await solo.guess(alice, game.id, '1567')
    expect(second.consistent).toBe(false)
  })

  it('scores a win and reveals the secret afterwards', async () => {
    await repo.profiles.create({ id: 'alice', username: 'Alice', email: null, isGuest: false })
    const game = await free('1234')
    await solo.start(alice, game.id)
    for (const wrong of ['5678', '1357', '2468', '9876', '1243']) {
      now += 1_000
      await solo.guess(alice, game.id, wrong)
    }
    now = START + 40_000
    const result = await solo.guess(alice, game.id, '1234')
    expect(result).toMatchObject({ solved: true, bulls: 4, score: 690 })
    const view = await solo.get(alice, game.id)
    expect(view).toMatchObject({ secret: '1234', won: true, score: 690, attempts: 6 })
    // Six attempts is top 37% of the fallback histogram: 3 stars, 40 + 12·3 XP.
    expect(await gameXp()).toBe(76)
    expect(await codeOf(solo.guess(alice, game.id, '9871'))).toBe('ERR_FINISHED')
  })

  it('gives no score and no xp for a practice win', async () => {
    await repo.profiles.create({ id: 'alice', username: 'Alice', email: null, isGuest: false })
    await solo.giveUp(alice, (await daily()).id)
    const practice = await daily()
    expect(practice.practice).toBe(true)
    await solo.start(alice, practice.id)
    const secret = dailySecret(SALT, sofiaDate(new Date(START)), 4, false)
    const result = await solo.guess(alice, practice.id, secret)
    expect(result).toMatchObject({ solved: true, score: 0 })
    expect(await solo.get(alice, practice.id)).toMatchObject({ won: true, score: 0 })
    expect((await repo.profiles.get('alice'))?.xp).toBe(0)
  })

  it('still scores when the player has no profile row yet', async () => {
    const game = await free('1234')
    await solo.start(alice, game.id)
    now += 5_000
    expect((await solo.guess(alice, game.id, '1234')).solved).toBe(true)
  })

  it('pays the number of the day 150 XP plus 20 per star and the day-streak bonus', async () => {
    await repo.profiles.create({ id: 'alice', username: 'Alice', email: null, isGuest: false })
    const game = await daily()
    await solo.start(alice, game.id)
    now += 5_000
    const secret = dailySecret(SALT, sofiaDate(new Date(START)), 4, false)
    expect((await solo.guess(alice, game.id, secret)).solved).toBe(true)
    // One attempt is top 1%: five stars, plus +10 for a day streak of one.
    expect(await gameXp()).toBe(260)
  })

  it('pays full XP for ten free games a Sofia day and 10 XP after that', async () => {
    await repo.profiles.create({ id: 'alice', username: 'Alice', email: null, isGuest: false })
    const winFree = async () => {
      const game = await free('1234')
      await solo.start(alice, game.id)
      now += 5_000
      await solo.guess(alice, game.id, '5678')
      now += 5_000
      await solo.guess(alice, game.id, '1234')
    }
    now = Date.parse('2026-10-20T19:00:00Z') // 22:00 Sofia
    for (let i = 0; i < 10; i += 1) await winFree()
    // Two attempts is top 1%: five stars, 40 + 12·5 XP each.
    expect(await gameXp()).toBe(1000)
    await winFree()
    expect(await gameXp()).toBe(1010)
    now = Date.parse('2026-10-20T22:30:00Z') // 01:30 Sofia, the next day
    await winFree()
    expect(await gameXp()).toBe(1110)
  })

  it('flags bot-like pacing as suspicious', async () => {
    const game = await free('1234')
    await solo.start(alice, game.id)
    for (const g of ['5678', '1357', '1234']) {
      now += 100
      await solo.guess(alice, game.id, g)
    }
    expect((await repo.games.get(game.id))?.suspicious).toBe(true)
  })
})

describe('day streak and badges', () => {
  const profile = () => repo.profiles.get('alice')

  /** Wins the number of the day for the Sofia date of `now` in one guess. */
  async function winDaily() {
    const game = await daily()
    await solo.start(alice, game.id)
    now += 5_000
    const date = sofiaDate(new Date(now))
    await solo.guess(alice, game.id, dailySecret(SALT, date, 4, false))
  }

  beforeEach(async () => {
    await repo.profiles.create({ id: 'alice', username: 'Alice', email: null, isGuest: false })
  })

  it('counts consecutive Sofia days across midnight and pays +10 XP per day', async () => {
    now = Date.parse('2026-10-20T20:30:00Z') // 23:30 Sofia, 20 October
    await winDaily()
    expect(await profile()).toMatchObject({ currentStreak: 1, bestStreak: 1 })
    expect(await gameXp()).toBe(260)
    now = Date.parse('2026-10-20T21:30:00Z') // 00:30 Sofia, 21 October
    await winDaily()
    expect(await profile()).toMatchObject({
      currentStreak: 2,
      bestStreak: 2,
      streakDate: '2026-10-21',
    })
    expect(await gameXp()).toBe(260 + 270)
  })

  it('does not extend the streak with a second length the same day', async () => {
    await winDaily()
    const game = await solo.create(alice, { len: 5, zero: false, kind: 'daily' })
    await solo.start(alice, game.id)
    await solo.guess(alice, game.id, dailySecret(SALT, sofiaDate(new Date(now)), 5, false))
    expect(await profile()).toMatchObject({ currentStreak: 1, bestStreak: 1 })
  })

  it('resets the streak after a missed day but keeps the best', async () => {
    await winDaily()
    now += DAY_MS
    await winDaily()
    now += 2 * DAY_MS
    await winDaily()
    expect(await profile()).toMatchObject({ currentStreak: 1, bestStreak: 2 })
    expect(await held()).not.toContain('streak')
  })

  it('awards the streak badge on the seventh day and caps the bonus at +70', async () => {
    for (let day = 0; day < 8; day += 1) {
      now = START + day * DAY_MS
      await winDaily()
    }
    expect(await profile()).toMatchObject({ currentStreak: 8, bestStreak: 8 })
    expect(await repo.badges.listOf('alice')).toContainEqual(
      expect.objectContaining({ key: 'streak', tier: 1, progress: 8 }),
    )
    // 250 per win plus 10, 20, ... 70, 70.
    expect(await gameXp()).toBe(8 * 250 + 10 + 20 + 30 + 40 + 50 + 60 + 70 + 70)
  })

  it('returns the new tiers of a counted win and pays +50 XP per tier', async () => {
    const win = await free('1234')
    await solo.start(alice, win.id)
    now += 5_000
    const result = await solo.guess(alice, win.id, '1234')
    // One quick clean guess at a ladder secret: lucky, noWaste, sherlock, underMinute, bolt, ladder.
    const keys = ['noWaste', 'sherlock', 'lucky', 'underMinute', 'bolt', 'ladder']
    expect(result.newBadges?.map((b) => b.key).sort()).toEqual([...keys].sort())
    expect(result.newBadges?.every((b) => b.tier === 1)).toBe(true)
    expect((await profile())?.xp).toBe(100 + BADGE_XP * keys.length)
    expect(await held()).toEqual(expect.arrayContaining(keys))
  })

  it('returns the pasture rewards the win unlocked (newUnlocks), and none when nothing new', async () => {
    await repo.profiles.addXp('alice', xpForLevel(5) - 1)
    const win = await free('1234')
    await solo.start(alice, win.id)
    now += 5_000
    const result = await solo.guess(alice, win.id, '1234')
    expect(result.newUnlocks).toEqual(['dog'])
    const lost = await solo.giveUp(alice, (await free('5678')).id)
    expect(lost.newUnlocks).toEqual([])
  })

  it('keeps badges after a loss and gives none for a practice win', async () => {
    const win = await free('1234')
    await solo.start(alice, win.id)
    now += 5_000
    await solo.guess(alice, win.id, '1234')
    const earned = await held()
    expect(earned).toContain('noWaste')
    const lost = await solo.giveUp(alice, (await free('5678')).id)
    expect(lost.newBadges).toEqual([])
    expect(await held()).toEqual(earned)
    await solo.giveUp(alice, (await daily()).id)
    const practice = await solo.create(alice, { len: 5, zero: false, kind: 'daily' })
    await solo.giveUp(alice, practice.id)
    const again = await solo.create(alice, { len: 5, zero: false, kind: 'daily' })
    expect(again.practice).toBe(true)
    await solo.start(alice, again.id)
    const secret = dailySecret(SALT, sofiaDate(new Date(now)), 5, false)
    const result = await solo.guess(alice, again.id, secret)
    expect(result.newBadges).toBeUndefined()
    expect(await held()).not.toContain('five')
  })

  it('remembers that the notebook was used, also on a give-up, and counts it for „notes“', async () => {
    const first = await free('1234')
    await solo.start(alice, first.id)
    await solo.guess(alice, first.id, '5678', true)
    await solo.guess(alice, first.id, '5687', false)
    expect((await repo.games.get(first.id))?.usedNotes).toBe(true)
    const second = await free('1234')
    await solo.giveUp(alice, second.id, true)
    expect((await repo.games.get(second.id))?.usedNotes).toBe(true)
    const third = await free('1234')
    await solo.giveUp(alice, third.id)
    expect((await repo.games.get(third.id))?.usedNotes).toBe(false)
    expect(await repo.badges.listOf('alice')).toContainEqual(
      expect.objectContaining({ key: 'notes', tier: 0, progress: 1 }),
    )
  })

  it('numbers the day in the view of a daily game', async () => {
    now = Date.parse('2026-10-23T09:00:00Z')
    const game = await daily()
    expect(game.dailyNumber).toBe(2)
    expect((await free('1234')).dailyNumber).toBeUndefined()
  })
})

describe('giveUp and get', () => {
  it('ends the game as a loss with score 0', async () => {
    const game = await free('1234')
    const { secret } = await solo.giveUp(alice, game.id)
    expect(secret).toBe('1234')
    expect(await solo.get(alice, game.id)).toMatchObject({ won: false, score: 0, secret: '1234' })
    expect(await codeOf(solo.giveUp(alice, game.id))).toBe('ERR_FINISHED')
  })

  it('never exposes the secret before the end', async () => {
    const game = await free('1234')
    await solo.start(alice, game.id)
    await solo.guess(alice, game.id, '5678')
    const view = await solo.get(alice, game.id)
    expect(view).not.toHaveProperty('secret')
    expect(JSON.stringify(view)).not.toContain('1234')
    expect(view.guesses).toEqual([
      { guess: '5678', bulls: 0, cows: 0, consistent: true, left: 120 },
    ])
  })

  it('treats another player or a missing game as not found', async () => {
    const game = await free('1234')
    for (const run of [
      () => solo.get(bob, game.id),
      () => solo.start(bob, game.id),
      () => solo.guess(bob, game.id, '5678'),
      () => solo.giveUp(bob, game.id),
      () => solo.get(alice, 'missing'),
    ]) {
      expect(await codeOf(run())).toBe('ERR_NOT_FOUND')
    }
  })
})

describe('concurrency', () => {
  it('returns the same counted daily game to two simultaneous creates', async () => {
    const [a, b] = await Promise.all([daily(), daily()])
    expect(a.id).toBe(b.id)
    expect(a.practice).toBe(false)
    const date = sofiaDate(new Date(START))
    expect((await repo.games.dailyOf('alice', date, 4, false))?.id).toBe(a.id)
  })

  it('accepts the same guess only once when sent twice at the same time', async () => {
    const game = await free('1234')
    await solo.start(alice, game.id)
    const codes = await Promise.all([
      codeOf(solo.guess(alice, game.id, '5678')),
      codeOf(solo.guess(alice, game.id, '5678')),
    ])
    expect(codes.sort()).toEqual(['ERR_REPEAT', null].sort())
    expect(await repo.games.guesses(game.id)).toHaveLength(1)
  })
})

describe('wasted', () => {
  it('counts guesses that did not fit the earlier answers', async () => {
    const game = await free('5678')
    await solo.start(alice, game.id)
    await solo.guess(alice, game.id, '1234')
    await solo.guess(alice, game.id, '1567')
    expect((await repo.games.get(game.id))?.wasted).toBe(1)
    await solo.guess(alice, game.id, '5678')
    expect(await repo.games.get(game.id)).toMatchObject({ wasted: 1, won: true })
  })
})
