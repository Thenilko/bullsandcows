import { describe, expect, it } from 'vitest'
import {
  BOT_LEVEL1_RANDOM_CHANCE,
  BOT_SEARCH,
  BOT_THINK_BASE,
  botGuess,
  botThinkMs,
  expertProbes,
  type BotLevel,
} from './bot'
import { filterCandidates } from './candidates'
import { codes, isValidCode } from './codes'
import { bullsCows } from './verdict'
import { mulberry32, sequenceRng } from './test-utils'

const LEVELS: readonly BotLevel[] = [1, 2, 3, 4]

describe('constants', () => {
  it('match the design prototype', () => {
    expect(BOT_THINK_BASE.race).toEqual([11000, 8500, 6500, 2500])
    expect(BOT_THINK_BASE.classic).toEqual([3600, 3000, 2500, 2000])
    expect(BOT_LEVEL1_RANDOM_CHANCE).toBe(0.35)
    expect(BOT_SEARCH).toEqual({ 3: { k: 12 }, 4: { budget: 6_000_000 } })
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

  it('level 2 picks from the candidates', () => {
    for (let seed = 0; seed < 100; seed++) {
      const g = botGuess(['1234', '5678'], ['9876'], 2, 4, false, mulberry32(seed))
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

  it('level 3 draws 12 probes from the pool and keeps the one with the smallest worst-case bucket', () => {
    const cands = all.slice(100, 140)
    const seed = 7
    const rng = mulberry32(seed)
    const probes = Array.from({ length: BOT_SEARCH[3].k }, () => cands[Math.floor(rng() * cands.length)])
    const worst = (g: string): number => {
      const m = new Map<number, number>()
      for (const c of cands) {
        const v = bullsCows(c, g)
        const key = v.bulls * 10 + v.cows
        m.set(key, (m.get(key) ?? 0) + 1)
      }
      return Math.max(...m.values())
    }
    const expected = probes.reduce((best, g) => (worst(g) < worst(best) ? g : best))
    expect(botGuess(cands, ['9876'], 3, 4, false, mulberry32(seed))).toBe(expected)
  })

  it('level 3 consumes exactly k draws; level 4 none when every code fits the budget', () => {
    const countCalls = (level: BotLevel): number => {
      let calls = 0
      botGuess(all.slice(0, 300), ['9876'], level, 4, false, () => {
        calls++
        return 0
      })
      return calls
    }
    expect(countCalls(3)).toBe(BOT_SEARCH[3].k)
    expect(countCalls(4)).toBe(0)
  })

  it('level 4 plays an inconsistent probe when it splits the candidates better', () => {
    // The four candidates differ only in the last digit: any of them leaves three
    // indistinguishable; a code that places 5 last and 6 elsewhere sorts them into three answers.
    const cands = ['1234', '1235', '1236', '1237']
    const g = botGuess(cands, ['1289'], 4, 4, false, () => 0)
    expect(cands).not.toContain(g)
    const answers = new Set(cands.map((c) => JSON.stringify(bullsCows(c, g))))
    expect(answers.size).toBe(3)
  })

  it('with one or two candidates left every level guesses a candidate', () => {
    for (const level of LEVELS) {
      expect(['5678', '5679']).toContain(botGuess(['5678', '5679'], ['1234'], level, 4, false, () => 0.99))
      expect(botGuess(['5678'], ['1234'], level, 4, false, () => 0.99)).toBe('5678')
    }
  })
})

describe('expertProbes', () => {
  const all = codes(4, false)

  it('uses every code when the budget allows, else the pool, else a sample of the pool', () => {
    const pool = all.slice(0, 100)
    expect(expertProbes(pool, all, all.length * 100, () => 0)).toBe(all)
    expect(expertProbes(pool, all, 100 * 100, () => 0)).toBe(pool)
    let calls = 0
    const sample = expertProbes(pool, all, 100 * 7, () => {
      calls++
      return 0.5
    })
    expect(sample).toHaveLength(7)
    expect(calls).toBe(7)
    expect(sample.every((p) => pool.includes(p))).toBe(true)
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
    expect(botThinkMs(1, false, () => 0)).toBe(9000)
    expect(botThinkMs(4, true, () => 0.9999)).toBe(2700)
    expect(botThinkMs(2, false, () => 0.5)).toBe(8750)
    expect(botThinkMs(3, true, () => 0)).toBe(2000)
  })

  it('keeps the expert race move between 2 and 3 seconds', () => {
    expect(botThinkMs(4, false, () => 0)).toBe(2000)
    expect(botThinkMs(4, false, () => 0.9999)).toBe(3000)
    expect(botThinkMs(3, false, () => 0)).toBe(4500)
  })
})
