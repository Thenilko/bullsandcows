import { BADGES } from '@bc/game-core'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRepo } from '../adapters/repo/memory'
import type { BadgeState, DuelRow, Repo } from '../ports/repo'
import {
  badgesInScope,
  heldBadges,
  mergeBadgeStates,
  recomputeBadges,
  toBadgeStates,
  toDuelFacts,
  toGameFacts,
} from './badgeService'

const NOW = 1_700_000_000_000

describe('mergeBadgeStates', () => {
  it('writes only what moved and dates a new tier now, keeping older times', () => {
    const current: BadgeState[] = [
      { key: 'noWaste', tier: 1, progress: 4, earnedAt: 1_000 },
      { key: 'five', tier: 0, progress: 0, earnedAt: 1_000 },
    ]
    const merged = mergeBadgeStates(
      current,
      [
        { key: 'noWaste', progress: 10 },
        { key: 'five', progress: 0 },
        { key: 'lucky', progress: 0 },
        { key: 'notes', progress: 3 },
      ],
      NOW,
    )
    expect(merged.rows).toEqual([
      { key: 'noWaste', tier: 2, progress: 10, earnedAt: NOW },
      { key: 'notes', tier: 0, progress: 3, earnedAt: NOW },
    ])
    expect(merged.newBadges).toEqual([{ key: 'noWaste', tier: 2 }])
    expect(merged.newTiers).toBe(1)
  })

  it('counts every tier gained at once and never lowers progress or tier', () => {
    const jump = mergeBadgeStates([], [{ key: 'bolt', progress: 30 }], NOW)
    expect(jump.newBadges).toEqual([{ key: 'bolt', tier: 3 }])
    expect(jump.newTiers).toBe(3)
    const current: BadgeState[] = [{ key: 'bolt', tier: 3, progress: 30, earnedAt: 5 }]
    const lower = mergeBadgeStates(current, [{ key: 'bolt', progress: 2 }], NOW)
    expect(lower).toEqual({ rows: [], newBadges: [], newTiers: 0 })
  })
})

describe('toBadgeStates and heldBadges', () => {
  it('describes all 29 badges, hidden ones by key alone, with the next threshold', () => {
    const states = toBadgeStates([{ key: 'streak', tier: 1, progress: 9, earnedAt: 7 }])
    expect(states).toHaveLength(BADGES.length)
    expect(states.find((s) => s.key === 'streak')).toEqual({
      key: 'streak',
      tier: 1,
      progress: 9,
      next: 30,
      earnedAt: 7,
    })
    expect(states.find((s) => s.key === 'mirror')).toEqual({
      key: 'mirror',
      tier: 0,
      progress: 0,
      next: 1,
      earnedAt: null,
    })
    expect(toBadgeStates([{ key: 'lucky', tier: 1, progress: 1, earnedAt: 7 }])[3]?.next).toBeNull()
  })

  it('holds a badge from tier 1 on', () => {
    const held = heldBadges([
      { key: 'five', tier: 2, progress: 10, earnedAt: 1 },
      { key: 'notes', tier: 0, progress: 4, earnedAt: 1 },
    ])
    expect(held.five).toBe(true)
    expect(held.notes).toBe(false)
    expect(Object.keys(held)).toHaveLength(BADGES.length)
  })
})

describe('scopes and facts', () => {
  it('leaves the „together“ group to shares and everything else to games', () => {
    expect(badgesInScope('share')).toEqual(['invite', 'family', 'teller', 'weekly'])
    expect(badgesInScope('game')).not.toContain('teller')
    expect(badgesInScope('game')).toContain('invite')
    expect(badgesInScope('game')).toContain('mirror')
    expect(badgesInScope('all')).toHaveLength(BADGES.length)
  })

  it('turns duel rows into facts from the player side, oldest first', () => {
    const row = (over: Partial<DuelRow>): DuelRow => ({
      id: 'd',
      format: 'race',
      len: 4,
      zero: false,
      opponentKind: 'quick',
      botLevel: null,
      inviteCode: null,
      playerA: 'me',
      playerB: 'you',
      gameA: null,
      gameB: null,
      winner: 'me',
      outcome: 'solved',
      ratingDeltaA: null,
      ratingDeltaB: null,
      createdAt: 1,
      finishedAt: 2,
      rewardsApplied: true,
      isRematch: false,
      comeback: false,
      ...over,
    })
    const facts = toDuelFacts('me', [
      row({ id: 'newest', winner: 'you', comeback: true }),
      row({ id: 'bot', opponentKind: 'bot', botLevel: 2, playerB: null }),
      row({ id: 'oldest', isRematch: true, comeback: true, inviteCode: 'ABCDE' }),
    ])
    expect(facts).toEqual([
      { vsHuman: true, won: true, botLevel: null, isRematch: true, comeback: true, invitee: 'you' },
      { vsHuman: false, won: true, botLevel: 2, isRematch: false, comeback: false, invitee: null },
      {
        vsHuman: true,
        won: false,
        botLevel: null,
        isRematch: false,
        comeback: false,
        invitee: null,
      },
    ])
  })

  it('keeps counted finished games only', () => {
    const base = {
      id: 'g',
      userId: 'me',
      kind: 'free' as const,
      len: 4 as const,
      zero: false,
      dailyDate: null,
      practice: false,
      startedAt: NOW - 45_000,
      finishedAt: NOW,
      attempts: 3,
      wasted: 0,
      won: true,
      score: 1,
      suspicious: false,
      usedNotes: true,
      createdAt: NOW,
    }
    const facts = toGameFacts([
      base,
      { ...base, finishedAt: null },
      { ...base, practice: true },
      { ...base, startedAt: null, won: false },
    ])
    expect(facts).toHaveLength(2)
    expect(facts[0]).toMatchObject({ durationMs: 45_000, won: true, usedNotes: true })
    expect(facts[1]).toMatchObject({ durationMs: null, won: false })
  })
})

describe('recomputeBadges', () => {
  let repo: Repo
  const clock = { now: () => NOW }

  beforeEach(async () => {
    repo = createMemoryRepo(clock)
    await repo.profiles.create({ id: 'me', username: 'Me', email: null, isGuest: false })
  })

  async function win(over: { len?: 3 | 4 | 5; zero?: boolean } = {}) {
    const game = await repo.games.create({
      userId: 'me',
      kind: 'free',
      len: over.len ?? 4,
      zero: over.zero ?? false,
      secret: '1234',
      dailyDate: null,
      practice: false,
    })
    await repo.games.update(game.id, {
      startedAt: NOW - 20_000,
      finishedAt: NOW,
      won: true,
      attempts: 3,
      wasted: 0,
    })
  }

  it('pays 50 XP per new tier on a game event and nothing when run again', async () => {
    await win()
    const first = await recomputeBadges(repo, {
      userId: 'me',
      scope: 'game',
      now: NOW,
      payXp: true,
    })
    expect(first.map((b) => b.key).sort()).toEqual([
      'bolt',
      'noWaste',
      'pure',
      'sherlock',
      'underMinute',
    ])
    expect((await repo.profiles.get('me'))?.xp).toBe(250)
    const again = await recomputeBadges(repo, {
      userId: 'me',
      scope: 'game',
      now: NOW + 1,
      payXp: true,
    })
    expect(again).toEqual([])
    expect((await repo.profiles.get('me'))?.xp).toBe(250)
    expect(await repo.badges.listOf('me')).toContainEqual(
      expect.objectContaining({ key: 'noWaste', tier: 1, progress: 1, earnedAt: NOW }),
    )
  })

  it('pays nothing for the backfill and keeps one-off events for good', async () => {
    await win()
    const found = await recomputeBadges(repo, {
      userId: 'me',
      scope: 'all',
      now: NOW,
      events: ['mirror'],
      payXp: false,
    })
    expect(found).toContainEqual({ key: 'mirror', tier: 1 })
    expect((await repo.profiles.get('me'))?.xp).toBe(0)
    await recomputeBadges(repo, { userId: 'me', scope: 'game', now: NOW + 5, payXp: true })
    expect(await repo.badges.listOf('me')).toContainEqual(
      expect.objectContaining({ key: 'mirror', tier: 1, earnedAt: NOW }),
    )
  })

  it('touches only the „together“ badges on a share', async () => {
    await win()
    for (let i = 0; i < 5; i += 1) {
      await repo.shares.add({ userId: 'me', gameId: `g${i}`, channel: 'copy', createdAt: NOW })
    }
    const found = await recomputeBadges(repo, {
      userId: 'me',
      scope: 'share',
      now: NOW,
      payXp: true,
    })
    expect(found).toEqual([{ key: 'teller', tier: 1 }])
    expect((await repo.badges.listOf('me')).map((b) => b.key)).toEqual(['teller'])
    expect((await repo.profiles.get('me'))?.xp).toBe(50)
  })
})
