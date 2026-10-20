import { DEFAULT_RATING } from '@bc/game-core'
import { beforeEach, describe, expect, it } from 'vitest'
import type { NewGame, PublicGameRow, Repo } from '../../../ports/repo'
import { createMemoryRepo } from './index'

let now = 1_000
const clock = { now: () => now }
let repo: Repo

beforeEach(() => {
  now = 1_000
  repo = createMemoryRepo(clock)
})

const member = (id: string, username: string) =>
  repo.profiles.create({ id, username, email: `${id}@example.com`, isGuest: false })

const newGame = (over: Partial<NewGame> = {}): NewGame => ({
  userId: 'u1',
  kind: 'free',
  len: 4,
  zero: false,
  secret: '1234',
  dailyDate: null,
  practice: false,
  ...over,
})

async function finishedGame(
  over: Partial<NewGame>,
  result: Partial<PublicGameRow>,
): Promise<PublicGameRow> {
  const game = await repo.games.create(newGame(over))
  return repo.games.update(game.id, { finishedAt: now, won: true, ...result })
}

describe('memory profiles', () => {
  it('creates a profile with defaults', async () => {
    const p = await member('u1', 'Mira')
    expect(p).toMatchObject({
      id: 'u1',
      username: 'Mira',
      usernameLower: 'mira',
      isGuest: false,
      lang: 'bg',
      sound: true,
      vibrate: true,
      defaultLen: 4,
      xp: 0,
      rating: DEFAULT_RATING,
      createdAt: 1_000,
    })
  })

  it('finds a username regardless of case', async () => {
    await member('u1', 'Mira')
    expect((await repo.profiles.getByUsername('MIRA'))?.id).toBe('u1')
    expect(await repo.profiles.getByUsername('Mir')).toBeNull()
  })

  it('refuses a username taken in another case', async () => {
    await member('u1', 'Mira')
    await expect(member('u2', 'mIRA')).rejects.toMatchObject({ code: 'ERR_USERNAME_TAKEN' })
  })

  it('does not mutate a previously returned object on update', async () => {
    const before = await member('u1', 'Mira')
    const after = await repo.profiles.update('u1', { username: 'Rada', sound: false })
    expect(before.username).toBe('Mira')
    expect(before.sound).toBe(true)
    expect(after).toMatchObject({ username: 'Rada', usernameLower: 'rada', sound: false })
    expect(await repo.profiles.getByUsername('mira')).toBeNull()
  })

  it('isolates stored state from callers', async () => {
    const created = await member('u1', 'Mira')
    ;(created as { xp: number }).xp = 999
    expect((await repo.profiles.get('u1'))?.xp).toBe(0)
  })

  it('adds xp and sets the rating', async () => {
    await member('u1', 'Mira')
    expect((await repo.profiles.addXp('u1', 120))?.xp).toBe(120)
    expect((await repo.profiles.addXp('u1', 40))?.xp).toBe(160)
    await repo.profiles.setRating('u1', { rating: 1600, rd: 200, vol: 0.06 })
    expect((await repo.profiles.get('u1'))?.rating).toEqual({ rating: 1600, rd: 200, vol: 0.06 })
  })

  it('reports a missing profile', async () => {
    expect(await repo.profiles.get('nobody')).toBeNull()
    expect(await repo.profiles.addXp('nobody', 1)).toBeNull()
  })
})

describe('memory games', () => {
  beforeEach(async () => {
    await member('u1', 'Mira')
  })

  it('never returns the secret except through getWithSecret', async () => {
    const daily = { kind: 'daily' as const, dailyDate: '2026-10-20' }
    const created = await repo.games.create(newGame(daily))
    expect(created).not.toHaveProperty('secret')
    expect(await repo.games.update(created.id, { attempts: 1 })).not.toHaveProperty('secret')
    expect(await repo.games.get(created.id)).not.toHaveProperty('secret')
    expect(await repo.games.dailyOf('u1', '2026-10-20', 4, false)).not.toHaveProperty('secret')
    const [first] = await repo.games.history('u1', 5)
    expect(first).toBeDefined()
    expect(first).not.toHaveProperty('secret')
    expect((await repo.games.getWithSecret(created.id))?.secret).toBe('1234')
    expect(await repo.games.getWithSecret('missing')).toBeNull()
  })

  it('creates games with defaults and keeps guesses in order', async () => {
    const game = await repo.games.create(newGame())
    expect(game).toMatchObject({
      startedAt: null,
      finishedAt: null,
      attempts: 0,
      wasted: 0,
      won: null,
      score: 0,
      suspicious: false,
    })
    await repo.games.addGuess({
      gameId: game.id,
      guess: '5678',
      bulls: 0,
      cows: 0,
      consistent: true,
      at: 2,
    })
    await repo.games.addGuess({
      gameId: game.id,
      guess: '1243',
      bulls: 2,
      cows: 2,
      consistent: true,
      at: 3,
    })
    await repo.games.addGuess({
      gameId: 'other',
      guess: '9876',
      bulls: 0,
      cows: 0,
      consistent: true,
      at: 4,
    })
    expect((await repo.games.guesses(game.id)).map((g) => g.guess)).toEqual(['5678', '1243'])
  })

  it('does not mutate a previously returned game on update', async () => {
    const game = await repo.games.create(newGame())
    const updated = await repo.games.update(game.id, { startedAt: 5, attempts: 1 })
    expect(game.startedAt).toBeNull()
    expect(updated).toMatchObject({ startedAt: 5, attempts: 1 })
    expect(await repo.games.get('missing')).toBeNull()
  })

  it('ignores undefined fields in a patch', async () => {
    const game = await repo.games.create(newGame())
    await repo.games.update(game.id, { startedAt: 5 })
    expect(
      (await repo.games.update(game.id, { startedAt: undefined, attempts: 2 })).startedAt,
    ).toBe(5)
  })

  it('finds the counted daily game, not a practice one', async () => {
    const daily = { kind: 'daily' as const, dailyDate: '2026-10-20' }
    const first = await repo.games.create(newGame(daily))
    await repo.games.create(newGame({ ...daily, practice: true }))
    expect((await repo.games.dailyOf('u1', '2026-10-20', 4, false))?.id).toBe(first.id)
    expect(await repo.games.dailyOf('u1', '2026-10-20', 4, true)).toBeNull()
    expect(await repo.games.dailyOf('u1', '2026-10-21', 4, false)).toBeNull()
  })

  it('filters won attempts by kind, len, zero, date and time', async () => {
    const day = { kind: 'daily' as const, dailyDate: '2026-10-20' }
    await finishedGame(day, { attempts: 5 })
    await finishedGame({ ...day, dailyDate: '2026-10-19' }, { attempts: 6 })
    await finishedGame({ ...day, practice: true }, { attempts: 7 })
    await finishedGame({ ...day, len: 5 }, { attempts: 8 })
    await finishedGame({ ...day, zero: true }, { attempts: 9 })
    await finishedGame({ ...day, userId: 'u2' }, { attempts: 10, won: false })
    await finishedGame({}, { attempts: 11 })
    now = 5_000
    await finishedGame({}, { attempts: 12 })
    expect(
      await repo.games.wonAttempts({ kind: 'daily', len: 4, zero: false, date: '2026-10-20' }),
    ).toEqual([5])
    expect((await repo.games.wonAttempts({ kind: 'daily', len: 4, zero: false })).sort()).toEqual([
      5, 6,
    ])
    expect(
      await repo.games.wonAttempts({ kind: 'free', len: 4, zero: false, sinceMs: 4_000 }),
    ).toEqual([12])
  })

  it('enforces one counted daily game per key and unique guesses, like the database', async () => {
    const day = { kind: 'daily' as const, dailyDate: '2026-10-20' }
    await repo.games.create(newGame(day))
    await expect(repo.games.create(newGame(day))).rejects.toMatchObject({ code: '23505' })
    await repo.games.create(newGame({ ...day, practice: true }))
    await repo.games.create(newGame({ ...day, userId: 'u2' }))
    const guess = { gameId: 'g', guess: '5678', bulls: 0, cows: 0, consistent: true, at: 1 }
    await repo.games.addGuess(guess)
    await expect(repo.games.addGuess(guess)).rejects.toMatchObject({ code: '23505' })
    await repo.games.addGuess({ ...guess, gameId: 'other' })
  })

  it('groups won daily attempts by date in one call', async () => {
    const day = (d: string) => ({ kind: 'daily' as const, dailyDate: d })
    await finishedGame(day('2026-10-19'), { attempts: 5 })
    await finishedGame({ ...day('2026-10-19'), userId: 'u2' }, { attempts: 6 })
    await finishedGame({ ...day('2026-10-20'), userId: 'u2' }, { attempts: 4 })
    await finishedGame({ ...day('2026-10-20'), practice: true }, { attempts: 3 })
    await finishedGame({ ...day('2026-10-21'), userId: 'u3' }, { attempts: 4 })
    await finishedGame({ ...day('2026-10-18'), len: 5 }, { attempts: 4 })
    const byDate = await repo.games.wonAttemptsByDate({
      len: 4,
      zero: false,
      dates: ['2026-10-19', '2026-10-20', '2026-10-18'],
    })
    expect({ ...byDate, '2026-10-19': [...(byDate['2026-10-19'] ?? [])].sort() }).toEqual({
      '2026-10-19': [5, 6],
      '2026-10-20': [4],
    })
    expect(await repo.games.wonAttemptsByDate({ len: 4, zero: false, dates: [] })).toEqual({})
  })

  it('lists history newest first with a limit', async () => {
    const ids: string[] = []
    for (let i = 0; i < 3; i += 1) {
      now = 1_000 + i
      ids.push((await repo.games.create(newGame())).id)
    }
    expect((await repo.games.history('u1', 2)).map((g) => g.id)).toEqual([ids[2], ids[1]])
    expect(await repo.games.history('nobody', 5)).toEqual([])
  })
})

describe('memory leaderboard', () => {
  const date = '2026-10-20'
  const q = { len: 4 as const, zero: false, date, weekStartMs: 2_000 }

  beforeEach(async () => {
    await member('u1', 'Mira')
    await member('u2', 'Rada')
    await member('u3', 'Ivo')
    await repo.profiles.create({ id: 'g1', username: 'guest-ABCD', email: null, isGuest: true })
  })

  it('ranks one player beyond the list limit with the same order', async () => {
    const day = { kind: 'daily' as const, dailyDate: date }
    now = 3_000
    await finishedGame({ ...day, userId: 'u1' }, { attempts: 6, score: 700 })
    await finishedGame({ ...day, userId: 'u1', practice: true }, { attempts: 2, score: 1100 })
    now = 2_500
    await finishedGame({ ...day, userId: 'u2' }, { attempts: 5, score: 700 })
    await finishedGame({ ...day, userId: 'u3' }, { attempts: 4, score: 900 })
    await finishedGame({ ...day, userId: 'g1' }, { attempts: 1, score: 1200 })
    const today = { ...q, period: 'today' as const }
    expect(await repo.games.leaderboardRankOf(today, 'u1')).toEqual({
      attempts: 6,
      score: 700,
      rank: 3,
    })
    expect(await repo.games.leaderboardRankOf(today, 'u3')).toEqual({
      attempts: 4,
      score: 900,
      rank: 1,
    })
    expect(await repo.games.leaderboardRankOf(today, 'g1')).toBeNull()
    expect(await repo.games.leaderboardRankOf(today, 'nobody')).toBeNull()
  })

  it('ranks today by score, ties by earlier finish, only won counted daily games', async () => {
    const day = { kind: 'daily' as const, dailyDate: date }
    now = 3_000
    await finishedGame({ ...day, userId: 'u1' }, { attempts: 6, score: 700 })
    now = 2_500
    await finishedGame({ ...day, userId: 'u2' }, { attempts: 5, score: 700 })
    await finishedGame({ ...day, userId: 'u3' }, { attempts: 9, score: 0, won: false })
    await finishedGame({ ...day, userId: 'u3', practice: true }, { attempts: 2, score: 1100 })
    await finishedGame({ ...day, userId: 'g1' }, { attempts: 1, score: 1200 })
    await finishedGame(
      { ...day, userId: 'u3', dailyDate: '2026-10-19' },
      { attempts: 1, score: 1200 },
    )
    await finishedGame({ userId: 'u3' }, { attempts: 1, score: 1200 })
    expect(await repo.games.leaderboard({ ...q, period: 'today' })).toEqual([
      { userId: 'u2', username: 'Rada', attempts: 5, score: 700 },
      { userId: 'u1', username: 'Mira', attempts: 6, score: 700 },
    ])
  })

  it('breaks a full tie by user id', async () => {
    const day = { kind: 'daily' as const, dailyDate: date }
    now = 3_000
    await finishedGame({ ...day, userId: 'u3' }, { attempts: 4, score: 900 })
    await finishedGame({ ...day, userId: 'u1' }, { attempts: 4, score: 900 })
    await finishedGame({ ...day, userId: 'u2' }, { attempts: 4, score: 900 })
    const rows = await repo.games.leaderboard({ ...q, period: 'today' })
    expect(rows.map((r) => r.userId)).toEqual(['u1', 'u2', 'u3'])
  })

  it('ranks the week by the best single solo game since the week start', async () => {
    now = 1_500
    await finishedGame({ userId: 'u1' }, { attempts: 2, score: 1100 })
    now = 2_500
    await finishedGame({ userId: 'u1' }, { attempts: 4, score: 900 })
    await finishedGame(
      { userId: 'u1', kind: 'daily', dailyDate: date },
      { attempts: 5, score: 800 },
    )
    await finishedGame(
      { userId: 'u2', kind: 'daily', dailyDate: date },
      { attempts: 3, score: 1000 },
    )
    await finishedGame({ userId: 'u3', kind: 'bot' }, { attempts: 1, score: 1200 })
    await finishedGame({ userId: 'u3', practice: true }, { attempts: 1, score: 1200 })
    expect(await repo.games.leaderboard({ ...q, period: 'week' })).toEqual([
      { userId: 'u2', username: 'Rada', attempts: 3, score: 1000 },
      { userId: 'u1', username: 'Mira', attempts: 4, score: 900 },
    ])
    expect((await repo.games.leaderboard({ ...q, period: 'all' }))[0]).toEqual({
      userId: 'u1',
      username: 'Mira',
      attempts: 2,
      score: 1100,
    })
  })
})

describe('memory duels', () => {
  it('creates, finishes and reads a duel', async () => {
    const duel = await repo.duels.create({
      format: 'race',
      len: 4,
      zero: false,
      opponentKind: 'friend',
      botLevel: null,
      inviteCode: 'ABCDE',
      playerA: 'u1',
      playerB: 'u2',
      gameA: null,
      gameB: null,
    })
    expect(duel).toMatchObject({ winner: null, outcome: null, finishedAt: null, createdAt: 1_000 })
    now = 9_000
    const done = await repo.duels.finish(duel.id, {
      winner: 'u1',
      outcome: 'win',
      ratingDeltaA: null,
      ratingDeltaB: null,
    })
    expect(done).toMatchObject({ winner: 'u1', outcome: 'win', finishedAt: 9_000 })
    expect(duel.finishedAt).toBeNull()
    expect(await repo.duels.get(duel.id)).toEqual(done)
    expect(await repo.duels.get('missing')).toBeNull()
  })

  const newDuel = {
    format: 'race',
    len: 4,
    zero: false,
    opponentKind: 'quick',
    botLevel: null,
    inviteCode: null,
    playerA: 'u1',
    playerB: 'u2',
    gameA: null,
    gameB: null,
  } as const

  it('creates a duel with a given id only once', async () => {
    const first = await repo.duels.create({ ...newDuel, id: 'd1' })
    now = 5_000
    const again = await repo.duels.create({ ...newDuel, id: 'd1', inviteCode: 'ZZZZZ' })
    expect(first).toMatchObject({ id: 'd1', rewardsApplied: false })
    expect(again).toEqual(first)
  })

  it('applies the rewards exactly once', async () => {
    await member('u1', 'anna')
    await member('u2', 'boris')
    const rating = { rating: 1600, rd: 200, vol: 0.06 }
    await repo.duels.create({ ...newDuel, id: 'd2' })
    const rewards = [
      { userId: 'u1', xp: 120, rating },
      { userId: 'u2', xp: 40, rating: null },
    ]
    expect(await repo.duels.applyRewards('d2', rewards)).toBe(true)
    expect(await repo.duels.applyRewards('d2', rewards)).toBe(false)
    expect(await repo.profiles.get('u1')).toMatchObject({ xp: 120, rating })
    expect(await repo.profiles.get('u2')).toMatchObject({ xp: 40, rating: DEFAULT_RATING })
    expect((await repo.duels.get('d2'))?.rewardsApplied).toBe(true)
    await expect(repo.duels.applyRewards('missing', rewards)).rejects.toThrow()
  })
})

describe('memory games with a given id', () => {
  it('creates the game once and returns the stored row on a retry', async () => {
    const first = await repo.games.create(newGame({ id: 'g-fixed', kind: 'duel_race' }))
    const again = await repo.games.create(newGame({ id: 'g-fixed', kind: 'duel_race' }))
    expect(first.id).toBe('g-fixed')
    expect(again).toEqual(first)
    expect(await repo.games.history('u1', 10)).toHaveLength(1)
  })
})
