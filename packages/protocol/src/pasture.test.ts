import { PASTURE_KEYS as CORE_KEYS } from '@bc/game-core'
import { describe, expect, it } from 'vitest'
import { GiveUpResultDto, GuessResultDto, PASTURE_KEYS, PastureDto, PasturePatch } from './rest'
import { ServerMsg } from './ws'

describe('pasture DTOs', () => {
  it('mirror the catalog keys of game-core', () => {
    expect([...PASTURE_KEYS]).toEqual([...CORE_KEYS])
  })

  it('accepts a patch of hidden items and a known colour only', () => {
    expect(PasturePatch.parse({ hiddenItems: ['dog'], barnColor: 'blue' })).toEqual({ hiddenItems: ['dog'], barnColor: 'blue' })
    expect(PasturePatch.parse({})).toEqual({})
    expect(PasturePatch.safeParse({ barnColor: '#3B76B8' }).success).toBe(false)
    expect(PasturePatch.safeParse({ hiddenItems: ['cat'] }).success).toBe(false)
    expect(PasturePatch.safeParse({ unlocked: ['dog'] }).success).toBe(false)
  })

  it('validates the pasture view', () => {
    const view = {
      level: 12,
      barnColor: 'red',
      items: [
        { key: 'dog', unlocked: true, shown: true },
        { key: 'windmill', unlocked: false, shown: false, progress: { current: 12, target: 15 } },
      ],
    }
    expect(PastureDto.parse(view)).toEqual(view)
  })

  it('carries newUnlocks next to newBadges at the end of a game, optionally', () => {
    expect(GuessResultDto.safeParse({ bulls: 4, cows: 0, consistent: true, left: 1, solved: true, newUnlocks: ['dog'] }).success).toBe(true)
    expect(GiveUpResultDto.safeParse({ secret: '1234', newUnlocks: ['nope'] }).success).toBe(false)
    const ended = { t: 'ended', outcome: 'win', reason: 'solved', secrets: { mine: '1234', theirs: '1234' }, rating: null, xp: 120 }
    expect(ServerMsg.safeParse({ ...ended, newUnlocks: ['windmill'] }).success).toBe(true)
  })
})
