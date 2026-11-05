import { describe, expect, it } from 'vitest'
import type { BoardRepoQuery, GameKind, OpponentKind, Repo } from '../../../ports/repo'
import { createMemoryRepo } from './index'

const NOW = Date.parse('2026-11-05T10:00:00Z')
const clock = { now: () => NOW }
const base: Omit<BoardRepoQuery, 'kind'> = {
  viewer: 'me',
  sinceMs: NOW - 3_600_000,
  liveFrom: '2026-11-04',
}

async function member(repo: Repo, id: string, guest = false) {
  await repo.profiles.create({ id, username: id.toUpperCase(), email: null, isGuest: guest })
}

async function duel(
  repo: Repo,
  a: string,
  b: string | null,
  winner: string | null,
  kind: OpponentKind = 'quick',
) {
  const d = await repo.duels.create({
    format: 'race',
    len: 4,
    zero: false,
    opponentKind: kind,
    botLevel: kind === 'bot' ? 1 : null,
    inviteCode: null,
    playerA: a,
    playerB: b,
    gameA: null,
    gameB: null,
  })
  await repo.duels.finish(d.id, {
    winner,
    outcome: 'solved',
    ratingDeltaA: null,
    ratingDeltaB: null,
    finishedAt: NOW,
  })
}

async function game(
  repo: Repo,
  userId: string,
  kind: GameKind,
  finishedAt: number | null,
  practice = false,
) {
  const g = await repo.games.create({
    userId,
    kind,
    len: 4,
    zero: false,
    secret: '1234',
    dailyDate: null,
    practice,
  })
  if (finishedAt !== null)
    await repo.games.update(g.id, { finishedAt, won: true, attempts: 5, score: 10 })
}

describe('memory boards', () => {
  it('duels: by rating, only players with a finished human duel, W–L–D, no guests', async () => {
    const repo = createMemoryRepo(clock)
    for (const id of ['a', 'b', 'c', 'botonly']) await member(repo, id)
    await member(repo, 'g', true)
    await repo.profiles.setRating('a', { rating: 1600, rd: 100, vol: 0.06 })
    await repo.profiles.setRating('b', { rating: 1700, rd: 100, vol: 0.06 })
    await repo.profiles.setRating('g', { rating: 2000, rd: 100, vol: 0.06 })
    await repo.profiles.setRating('botonly', { rating: 1900, rd: 100, vol: 0.06 })
    await duel(repo, 'a', 'b', 'a')
    await duel(repo, 'a', 'b', null, 'friend')
    await duel(repo, 'c', 'g', 'g')
    await duel(repo, 'botonly', null, 'botonly', 'bot')
    const rows = await repo.boards.top({ ...base, kind: 'duels' })
    expect(rows.map((r) => [r.userId, Math.round(r.value), r.wins, r.losses, r.draws])).toEqual([
      ['b', 1700, 0, 1, 1],
      ['a', 1600, 1, 0, 1],
      ['c', 1500, 0, 1, 0],
    ])
    expect(await repo.boards.placeOf({ ...base, kind: 'duels' }, 'c')).toEqual({
      rank: 3,
      value: 1500,
    })
    expect(await repo.boards.placeOf({ ...base, kind: 'duels' }, 'botonly')).toBeNull()
  })

  it('streaks: the live streak only (a broken one is out), ties by the best streak', async () => {
    const repo = createMemoryRepo(clock)
    for (const id of ['a', 'b', 'c', 'old']) await member(repo, id)
    await repo.profiles.setStreak('a', {
      currentStreak: 3,
      bestStreak: 3,
      streakDate: '2026-11-04',
    })
    await repo.profiles.setStreak('b', {
      currentStreak: 3,
      bestStreak: 9,
      streakDate: '2026-11-05',
    })
    await repo.profiles.setStreak('c', {
      currentStreak: 5,
      bestStreak: 5,
      streakDate: '2026-11-05',
    })
    await repo.profiles.setStreak('old', {
      currentStreak: 20,
      bestStreak: 20,
      streakDate: '2026-11-03',
    })
    const rows = await repo.boards.top({ ...base, kind: 'streaks' })
    expect(rows.map((r) => [r.userId, r.value, r.best])).toEqual([
      ['c', 5, 5],
      ['b', 3, 9],
      ['a', 3, 3],
    ])
  })

  it('herders: by xp, ties by user id, without zero xp and guests', async () => {
    const repo = createMemoryRepo(clock)
    for (const id of ['b', 'a', 'z']) await member(repo, id)
    await member(repo, 'g', true)
    await repo.profiles.addXp('a', 50)
    await repo.profiles.addXp('b', 50)
    await repo.profiles.addXp('g', 500)
    const rows = await repo.boards.top({ ...base, kind: 'herders' })
    expect(rows.map((r) => [r.userId, r.value])).toEqual([
      ['a', 50],
      ['b', 50],
    ])
  })

  it('games: counted solo and duel games finished in the period; ties by the earlier last finish', async () => {
    const repo = createMemoryRepo(clock)
    for (const id of ['a', 'b']) await member(repo, id)
    await game(repo, 'a', 'daily', NOW - 1000)
    await game(repo, 'a', 'duel_race', NOW - 500)
    await game(repo, 'a', 'free', NOW, true) // practice
    await game(repo, 'a', 'weekly', NOW)
    await game(repo, 'a', 'free', null) // unfinished
    await game(repo, 'b', 'free', NOW - 2000)
    await game(repo, 'b', 'bot', NOW - 1500)
    await game(repo, 'b', 'free', NOW - 7_200_000) // before the period
    const rows = await repo.boards.top({ ...base, kind: 'games' })
    expect(rows.map((r) => [r.userId, r.value])).toEqual([
      ['b', 2],
      ['a', 2],
    ])
  })

  it('friends: me and my human duel opponents by xp, with my head-to-head record', async () => {
    const repo = createMemoryRepo(clock)
    for (const id of ['me', 'f1', 'f2', 'stranger']) await member(repo, id)
    await member(repo, 'g', true)
    await repo.profiles.addXp('f1', 100)
    await repo.profiles.addXp('me', 50)
    await duel(repo, 'me', 'f1', 'me')
    await duel(repo, 'f1', 'me', 'f1')
    await duel(repo, 'f1', 'me', 'me')
    await duel(repo, 'f2', 'me', null)
    await duel(repo, 'me', 'g', 'me')
    await duel(repo, 'f1', 'stranger', 'f1')
    await duel(repo, 'me', null, 'me', 'bot')
    const rows = await repo.boards.top({ ...base, kind: 'friends' })
    expect(rows.map((r) => [r.userId, r.value, r.wins, r.losses, r.draws])).toEqual([
      ['f1', 100, 2, 1, 0],
      ['me', 50, undefined, undefined, undefined],
      ['f2', 0, 0, 0, 1],
    ])
    const alone = await repo.boards.top({ ...base, kind: 'friends', viewer: 'stranger' })
    expect(alone.map((r) => r.userId)).toEqual(['f1', 'stranger'])
  })
})
