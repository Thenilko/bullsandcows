import { DEFAULT_BOT_CONFIG } from '@bc/game-core'
import { describe, expect, it } from 'vitest'
import { BotConfigDto } from './bot'

const valid = { raceThinkMs: [30000, 20000, 15000, 10000], lostHint: [0.7, 0.5, 0.3], proSample: 8 }

describe('BotConfigDto', () => {
  it('accepts the game-core defaults', () => {
    expect(BotConfigDto.parse(DEFAULT_BOT_CONFIG)).toEqual(DEFAULT_BOT_CONFIG)
  })

  it('accepts values on the bounds', () => {
    expect(
      BotConfigDto.safeParse({
        raceThinkMs: [1000, 120000, 1000, 120000],
        lostHint: [0, 1, 0],
        proSample: 1,
      }).success,
    ).toBe(true)
    expect(BotConfigDto.safeParse({ ...valid, proSample: 50 }).success).toBe(true)
  })

  it.each([
    ['think below 1 s', { ...valid, raceThinkMs: [999, 20000, 15000, 10000] }],
    ['think above 120 s', { ...valid, raceThinkMs: [30000, 20000, 15000, 120001] }],
    ['a fractional think time', { ...valid, raceThinkMs: [30000.5, 20000, 15000, 10000] }],
    ['three think levels', { ...valid, raceThinkMs: [30000, 20000, 15000] }],
    ['a chance above 1', { ...valid, lostHint: [1.1, 0.5, 0.3] }],
    ['a negative chance', { ...valid, lostHint: [0.7, -0.1, 0.3] }],
    ['a chance for the expert', { ...valid, lostHint: [0.7, 0.5, 0.3, 0.1] }],
    ['a sample of 0', { ...valid, proSample: 0 }],
    ['a sample above 50', { ...valid, proSample: 51 }],
    ['a fractional sample', { ...valid, proSample: 2.5 }],
    ['an unknown key', { ...valid, extra: 1 }],
    ['a missing key', { raceThinkMs: valid.raceThinkMs, lostHint: valid.lostHint }],
    ['a string number', { ...valid, proSample: '6' }],
  ])('refuses %s', (_name, input) => {
    expect(BotConfigDto.safeParse(input).success).toBe(false)
  })
})
