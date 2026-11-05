import { describe, expect, it } from 'vitest'
import {
  BOT_RACE_JITTER,
  BOT_PRO_SAMPLE,
  BOT_RANDOM_CHANCE,
  BOT_THINK_BASE,
  botGuess,
  botThinkMs,
  type BotLevel,
} from './bot'
import { bestProbe } from './botSearch'
import { filterCandidates } from './candidates'
import { codes, isValidCode } from './codes'
import { bullsCows } from './verdict'
import { mulberry32, sequenceRng } from './test-utils'

const LEVELS: readonly BotLevel[] = [1, 2, 3, 4]
const all4 = codes(4, false)

describe('constants', () => {
  it("keep every level at a person's pace and only the expert sure of every hint", () => {
    expect(BOT_THINK_BASE.race).toEqual([35000, 25000, 18000, 12000])
    expect(BOT_THINK_BASE.classic).toEqual([3600, 3000, 2500, 2000])
    expect(BOT_RACE_JITTER).toEqual([
      [-5000, 5000],
      [-5000, 5000],
      [-4000, 4000],
      [-3000, 3000],
    ])
    expect(BOT_RANDOM_CHANCE).toEqual({ 1: 0.8, 2: 0.6, 3: 0.45 })
    expect(BOT_PRO_SAMPLE).toBe(6)
  })

  it('average guesses on 4 digits: about 10 easy, 7 normal, 6 hard, 5 expert', () => {
    const avg = (level: BotLevel): number => {
      const rng = mulberry32(level * 1000 + 7)
      let total = 0
      const games = 300
      for (let i = 0; i < games; i++) {
        const secret = all4[Math.floor(rng() * all4.length)]!
        let cands = all4
        const guessed: string[] = []
        for (;;) {
          const g = botGuess(cands, guessed, level, 4, false, rng)
          guessed.push(g)
          const v = bullsCows(secret, g)
          if (v.bulls === 4) break
          cands = filterCandidates(cands, g, v)
        }
        total += guessed.length
      }
      return total / games
    }
    expect(avg(1)).toBeGreaterThan(9)
    expect(avg(2)).toBeGreaterThan(6.5)
    expect(avg(2)).toBeLessThan(8)
    expect(avg(3)).toBeGreaterThan(5.8)
    expect(avg(3)).toBeLessThan(6.8)
    expect(avg(4)).toBeLessThan(5.4)
    expect(avg(4)).toBeLessThan(avg(3))
  }, 30_000)
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

  it('opens with a random code at every level (all first guesses are equivalent): one draw', () => {
    for (const level of LEVELS) {
      let calls = 0
      const g = botGuess(all, [], level, 4, false, () => {
        calls++
        return 0.5
      })
      expect(g).toBe(all[Math.floor(all.length / 2)])
      expect(calls).toBe(1)
    }
  })

  it('level 4 always picks from the candidates', () => {
    const cands = all.slice(0, 40)
    for (let seed = 0; seed < 100; seed++) {
      expect(cands).toContain(botGuess(cands, ['9876'], 4, 4, false, mulberry32(seed)))
    }
  })

  it('falls back to all candidates when every one was already guessed', () => {
    expect(botGuess(['1234'], ['1234'], 4, 4, false, () => 0)).toBe('1234')
  })

  it('levels 1–3 sometimes guess outside the candidates (a lost hint)', () => {
    const cands = ['5678', '5679']
    for (const level of [1, 2, 3] as const) {
      const g = botGuess(cands, ['1234'], level, 4, false, sequenceRng([0.1, 0]))
      expect(cands).not.toContain(g)
      expect(g).toBe('1235')
    }
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

  it('levels 1 and 2 stay on candidates when the roll is above their chance', () => {
    expect(botGuess(['5678', '5679'], ['1234'], 1, 4, false, sequenceRng([0.85, 0.99]))).toBe(
      '5679',
    )
    expect(botGuess(['5678', '5679'], ['1234'], 2, 4, false, sequenceRng([0.65, 0.99]))).toBe(
      '5679',
    )
    // 0.7 is a random move at „Лесно“ (0.8) but a fitting one at „Средно“ (0.6).
    expect(['5678', '5679']).not.toContain(
      botGuess(['5678', '5679'], ['1234'], 1, 4, false, sequenceRng([0.7, 0])),
    )
    expect(botGuess(['5678', '5679'], ['1234'], 2, 4, false, sequenceRng([0.7, 0]))).toBe('5678')
    expect(botGuess(['5678', '5679'], ['1234'], 3, 4, false, sequenceRng([0.5, 0.99]))).toBe('5679')
  })

  it('level 3 rolls then draws; level 4 draws its sample, or none from a small pool', () => {
    const countCalls = (level: BotLevel, pool: readonly string[]): number => {
      let calls = 0
      botGuess(pool, ['9876'], level, 4, false, () => {
        calls++
        return 0.99
      })
      return calls
    }
    expect(countCalls(3, all.slice(0, 300))).toBe(2)
    expect(countCalls(4, all.slice(0, 300))).toBe(BOT_PRO_SAMPLE)
    expect(countCalls(4, all.slice(0, BOT_PRO_SAMPLE))).toBe(0)
  })

  it('the expert keeps, of the candidates it weighs, the one that splits the rest best', () => {
    const cands = ['1234', '1243', '2134', '5678', '5687']
    const g = botGuess(cands, ['9012'], 4, 4, false, () => 0)
    expect(g).toBe(bestProbe(cands, cands, 4, 'expected'))
  })

  it('with one or two candidates left every level guesses a candidate', () => {
    for (const level of LEVELS) {
      expect(['5678', '5679']).toContain(
        botGuess(['5678', '5679'], ['1234'], level, 4, false, () => 0.99),
      )
      expect(botGuess(['5678'], ['1234'], level, 4, false, () => 0.99)).toBe('5678')
    }
  })
})

/** Plays a full solo game with the bot guessing `secret`; returns the number of guesses. */
function playOut(secret: string, level: BotLevel, rng: () => number): number {
  const all = codes(4, false)
  let cands = all
  const guessed: string[] = []
  for (let n = 1; n <= 12; n++) {
    const g = botGuess(cands, guessed, level, 4, false, rng)
    guessed.push(g)
    const v = bullsCows(secret, g)
    if (v.bulls === 4) return n
    cands = filterCandidates(cands, g, v)
  }
  return 13
}

describe('strength', () => {
  it('the expert needs about five guesses on average and never more than seven', () => {
    const all = codes(4, false)
    const rng = mulberry32(2026)
    const games = 24
    let total = 0
    for (let i = 0; i < games; i++) {
      const secret = all[Math.floor(rng() * all.length)]
      const n = playOut(secret, 4, rng)
      expect(n).toBeLessThanOrEqual(7)
      total += n
    }
    expect(total / games).toBeLessThanOrEqual(5.6)
  }, 30_000)

  it('ranks the levels: medium needs more guesses than the expert over the same secrets', () => {
    const all = codes(4, false)
    const secrets = Array.from({ length: 24 }, (_, i) => all[(i * 127) % all.length])
    const mean = (level: BotLevel): number =>
      secrets.reduce((sum, s, i) => sum + playOut(s, level, mulberry32(i)), 0) / secrets.length
    expect(mean(4)).toBeLessThan(mean(2))
  }, 30_000)
})

describe('botThinkMs', () => {
  it('computes race and classic timings with jitter', () => {
    expect(botThinkMs(1, false, () => 0)).toBe(30000)
    expect(botThinkMs(4, true, () => 0.9999)).toBe(2700)
    expect(botThinkMs(2, false, () => 0.5)).toBe(25000)
    expect(botThinkMs(3, true, () => 0)).toBe(2000)
  })

  it("keeps the expert race move at a quick person's 9–15 seconds", () => {
    expect(botThinkMs(4, false, () => 0)).toBe(9000)
    expect(botThinkMs(4, false, () => 0.9999)).toBe(15000)
    expect(botThinkMs(3, false, () => 0)).toBe(14000)
  })
})
