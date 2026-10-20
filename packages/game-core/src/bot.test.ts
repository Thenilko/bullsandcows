import { describe, expect, it } from 'vitest'
import {
  BOT_LEVEL1_RANDOM_CHANCE,
  BOT_MINIMAX,
  BOT_THINK_BASE,
  botGuess,
  botThinkMs,
  type BotLevel,
} from './bot'
import { codes, isValidCode } from './codes'
import { bullsCows } from './verdict'
import { mulberry32, sequenceRng } from './test-utils'

const LEVELS: readonly BotLevel[] = [1, 2, 3, 4]

describe('constants', () => {
  it('match the design prototype', () => {
    expect(BOT_THINK_BASE.race).toEqual([11000, 8500, 6500, 4500])
    expect(BOT_THINK_BASE.classic).toEqual([3600, 3000, 2500, 2000])
    expect(BOT_LEVEL1_RANDOM_CHANCE).toBe(0.35)
    expect(BOT_MINIMAX).toEqual({ 3: { k: 4, maxCands: 400 }, 4: { k: 10, maxCands: 900 } })
  })
})

describe('botGuess', () => {
  const all = codes(4, false)

  it('never repeats a guess and always returns a valid code', () => {
    for (const level of LEVELS) {
      for (let seed = 0; seed < 30; seed++) {
        const guessed = ['1234', '5678']
        const g = botGuess(all.slice(0, 50), guessed, level, 4, false, mulberry32(seed))
        expect(guessed).not.toContain(g)
        expect(isValidCode(g, 4, false)).toBe(true)
      }
    }
  })

  it('level 2 picks from the candidates', () => {
    for (let seed = 0; seed < 100; seed++) {
      const g = botGuess(['1234', '5678'], [], 2, 4, false, mulberry32(seed))
      expect(['1234', '5678']).toContain(g)
    }
  })

  it('falls back to all candidates when every one was already guessed', () => {
    expect(botGuess(['1234'], ['1234'], 2, 4, false, () => 0)).toBe('1234')
  })

  it('level 1 sometimes guesses outside the candidates (inconsistent guess)', () => {
    const cands = ['5678', '5679']
    const g = botGuess(cands, ['1234'], 1, 4, false, sequenceRng([0.1, 0]))
    expect(cands).not.toContain(g)
    expect(g).toBe('1235')
  })

  it('level 1 does not roll the random branch without prior guesses', () => {
    let calls = 0
    const rng = () => {
      calls++
      return 0
    }
    expect(botGuess(['5678', '5679'], [], 1, 4, false, rng)).toBe('5678')
    expect(calls).toBe(1)
  })

  it('level 1 stays on candidates when the roll is above the chance', () => {
    const g = botGuess(['5678', '5679'], ['1234'], 1, 4, false, sequenceRng([0.9, 0.99]))
    expect(g).toBe('5679')
  })

  it('level 3 minimax with constant rng picks pool[0]', () => {
    const cands = all.slice(0, 10)
    expect(botGuess(cands, [], 3, 4, false, () => 0)).toBe(cands[0])
  })

  it('level 3 keeps the draw with the smallest worst-case bucket', () => {
    const cands = all.slice(100, 110)
    const seed = 7
    const draws = (): string[] => {
      const rng = mulberry32(seed)
      return Array.from({ length: 4 }, () => cands[Math.floor(rng() * cands.length)])
    }
    const worst = (g: string): number => {
      const m = new Map<number, number>()
      for (const c of cands) {
        const v = bullsCows(c, g)
        const key = v.bulls * 10 + v.cows
        m.set(key, (m.get(key) ?? 0) + 1)
      }
      return Math.max(...m.values())
    }
    const expected = draws().reduce((best, g) => (worst(g) < worst(best) ? g : best))
    expect(botGuess(cands, [], 3, 4, false, mulberry32(seed))).toBe(expected)
  })

  it('level 4 uses minimax (10 draws) up to 900 candidates; level 3 only up to 400', () => {
    const countCalls = (n: number, level: BotLevel): number => {
      let calls = 0
      botGuess(all.slice(0, n), [], level, 4, false, () => {
        calls++
        return 0
      })
      return calls
    }
    expect(countCalls(500, 4)).toBe(10)
    expect(countCalls(500, 3)).toBe(1)
    expect(countCalls(400, 3)).toBe(4)
    expect(countCalls(901, 4)).toBe(1)
  })

  it('skips minimax for pools of two or fewer', () => {
    let calls = 0
    botGuess(['1234', '5678'], [], 4, 4, false, () => {
      calls++
      return 0
    })
    expect(calls).toBe(1)
  })
})

describe('botThinkMs', () => {
  it('computes race and classic timings with jitter', () => {
    expect(botThinkMs(1, false, () => 0)).toBe(9000)
    expect(botThinkMs(4, true, () => 0.9999)).toBe(2700)
    expect(botThinkMs(2, false, () => 0.5)).toBe(8750)
    expect(botThinkMs(3, true, () => 0)).toBe(2000)
  })
})
