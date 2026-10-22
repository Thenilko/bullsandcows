import { describe, expect, it } from 'vitest'
import { bestProbe } from './botSearch'
import { codes } from './codes'
import { bullsCows } from './verdict'

const partition = (pool: readonly string[], g: string): number[] => {
  const m = new Map<string, number>()
  for (const c of pool) {
    const key = JSON.stringify(bullsCows(c, g))
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  return [...m.values()]
}

describe('bestProbe', () => {
  const all = codes(4, true)

  it('agrees with a plain bulls/cows scorer on the worst bucket and the expected size', () => {
    const pool = all.filter((_, i) => i % 37 === 0)
    const probes = all.filter((_, i) => i % 53 === 0)
    const worst = (g: string) => Math.max(...partition(pool, g))
    const expected = (g: string) => partition(pool, g).reduce((s, b) => s + b * b, 0)
    const bestWorst = Math.min(...probes.map(worst))
    const bestExpected = Math.min(...probes.map(expected))
    expect(worst(bestProbe(pool, probes, 4, 'worst'))).toBe(bestWorst)
    expect(expected(bestProbe(pool, probes, 4, 'expected'))).toBe(bestExpected)
  })

  it('prefers a candidate on a tie', () => {
    // Both probes leave every candidate in its own bucket; the candidate can also win outright.
    const pool = ['0123', '4567']
    expect(bestProbe(pool, ['0189', '4567'], 4, 'expected')).toBe('4567')
    expect(bestProbe(pool, ['4567', '0189'], 4, 'worst')).toBe('4567')
  })

  it('handles codes with zero and all lengths', () => {
    for (const len of [3, 4, 5] as const) {
      const pool = codes(len, true).slice(0, 40)
      const g = bestProbe(pool, pool, len, 'expected')
      expect(pool).toContain(g)
    }
  })

  it('rejects an empty probe set', () => {
    expect(() => bestProbe(['0123'], [], 4, 'worst')).toThrow()
  })
})
