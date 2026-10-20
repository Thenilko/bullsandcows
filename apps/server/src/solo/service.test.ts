import { dailySecret, sofiaDate } from '@bc/game-core'
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
    expect((await repo.profiles.get('alice'))?.xp).toBe(690)
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
