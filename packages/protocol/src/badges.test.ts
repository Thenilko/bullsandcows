import { BADGE_KEYS as CORE_KEYS } from '@bc/game-core'
import { describe, expect, it } from 'vitest'
import { BADGE_KEYS, BadgeStateDto, LEGACY_BADGE_KEYS, NewBadgeDto, ShareBody } from './rest'
import { ClientMsg, ServerMsg } from './ws'

describe('badge keys', () => {
  it('mirror the 29 definitions in game-core', () => {
    expect([...BADGE_KEYS]).toEqual([...CORE_KEYS])
  })

  it('map every legacy key to a current one or to nothing', () => {
    expect(Object.keys(LEGACY_BADGE_KEYS).sort()).toEqual(
      ['chiefBull', 'firstBull', 'fiveDigits', 'noWaste', 'streak7', 'underMinute'].sort(),
    )
    for (const target of Object.values(LEGACY_BADGE_KEYS)) {
      if (target !== null) expect(BADGE_KEYS).toContain(target)
    }
  })

  it('validates badge states and new badges', () => {
    expect(
      BadgeStateDto.parse({ key: 'streak', tier: 1, progress: 9, next: 30, earnedAt: 1 }),
    ).toMatchObject({ key: 'streak' })
    expect(NewBadgeDto.safeParse({ key: 'lucky', tier: 0 }).success).toBe(false)
    expect(NewBadgeDto.safeParse({ key: 'firstBull', tier: 1 }).success).toBe(false)
  })

  it('accepts a share only for a uuid game and a known channel', () => {
    const gameId = '0f1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
    expect(ShareBody.safeParse({ gameId, channel: 'copy' }).success).toBe(true)
    expect(ShareBody.safeParse({ gameId: 'nope', channel: 'copy' }).success).toBe(false)
    expect(ShareBody.safeParse({ gameId, channel: 'sms' }).success).toBe(false)
  })

  it('carries usedNotes on a duel guess and newBadges on ended, both optional', () => {
    expect(ClientMsg.parse({ t: 'guess', code: '1234', usedNotes: true })).toEqual({
      t: 'guess',
      code: '1234',
      usedNotes: true,
    })
    expect(ClientMsg.parse({ t: 'guess', code: '1234' })).toEqual({ t: 'guess', code: '1234' })
    const ended = {
      t: 'ended',
      outcome: 'win',
      reason: 'solved',
      secrets: { mine: '1234', theirs: '1234' },
      rating: null,
      xp: 120,
    }
    expect(ServerMsg.safeParse(ended).success).toBe(true)
    expect(
      ServerMsg.safeParse({ ...ended, newBadges: [{ key: 'duelist', tier: 1 }] }).success,
    ).toBe(true)
  })
})
