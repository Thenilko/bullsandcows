import { describe, expect, it } from 'vitest'
import { BULL_SPOTS, COW_SPOTS, sceneAnimals } from './sceneAnimals'

describe('sceneAnimals', () => {
  it('idle gives two bulls and two cows sorted by y', () => {
    const a = sceneAnimals({ kind: 'idle' })
    expect(a).toHaveLength(4)
    expect(a.map((x) => x.y)).toEqual([...a.map((x) => x.y)].sort((p, q) => p - q))
    expect(a.every((x) => x.motion === 'idle')).toBe(true)
    expect(a.filter((x) => x.kind === 'bull').map((x) => x.delay).sort()).toEqual(['-1.3s', '0s'])
    expect(a.filter((x) => x.kind === 'cow').map((x) => x.delay).sort()).toEqual(['-1s', '-3s'])
  })

  it('play places running bulls and walking cows with staggered delays', () => {
    const a = sceneAnimals({ kind: 'play', bulls: 2, cows: 1 })
    const bulls = a.filter((x) => x.kind === 'bull')
    const cows = a.filter((x) => x.kind === 'cow')
    expect(bulls.map((b) => [b.x, b.y, b.motion, b.delay])).toEqual([
      [...BULL_SPOTS[0], 'run', '0s'],
      [...BULL_SPOTS[1], 'run', '0.16s'],
    ].sort((p, q) => Number(p[1]) - Number(q[1])))
    expect(cows).toEqual([{ kind: 'cow', x: COW_SPOTS[0][0], y: COW_SPOTS[0][1], scale: 0.875, motion: 'walk', delay: '0.35s' }])
  })

  it('play delays use the prototype arithmetic', () => {
    const a = sceneAnimals({ kind: 'play', bulls: 0, cows: 3 })
    expect(a.map((x) => x.delay).sort()).toEqual(['0.35s', '0.57s', '0.79s'].sort())
  })

  it('result gives bulls idle plus one cow on the first cow spot', () => {
    const a = sceneAnimals({ kind: 'result', bulls: 4 })
    expect(a.filter((x) => x.kind === 'bull')).toHaveLength(4)
    expect(a.filter((x) => x.kind === 'bull').map((x) => x.delay).sort()).toEqual(['-0.7s', '-1.4s', '-2.1s', '0s'].sort())
    const cows = a.filter((x) => x.kind === 'cow')
    expect(cows).toHaveLength(1)
    expect([cows[0].x, cows[0].y, cows[0].delay]).toEqual([...COW_SPOTS[0].slice(0, 2), '-2s'])
  })

  it('uses the smaller scale for back-row animals', () => {
    const a = sceneAnimals({ kind: 'idle' })
    for (const x of a) expect(x.scale).toBe(x.y < 280 ? 0.725 : 0.875)
  })

  it('clamps counts to the number of spots and never returns negatives', () => {
    expect(sceneAnimals({ kind: 'play', bulls: 9, cows: 9 })).toHaveLength(10)
    expect(sceneAnimals({ kind: 'play', bulls: -1, cows: 0 })).toHaveLength(0)
  })

  it('does not mutate the spot tables', () => {
    const before = JSON.stringify([BULL_SPOTS, COW_SPOTS])
    sceneAnimals({ kind: 'play', bulls: 5, cows: 5 })
    expect(JSON.stringify([BULL_SPOTS, COW_SPOTS])).toBe(before)
  })
})
