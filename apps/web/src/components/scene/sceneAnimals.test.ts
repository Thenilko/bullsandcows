import { describe, expect, it } from 'vitest'
import { BULL_SPOTS, COW_SPOTS, WIDE_BULL_SPOTS, WIDE_COW_SPOTS, sceneAnimals, wideSceneAnimals } from './sceneAnimals'

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

describe('wideSceneAnimals', () => {
  it('uses the wide spots of the spec with their scales', () => {
    expect(WIDE_BULL_SPOTS).toEqual([[300, 600, 1.9], [455, 602, 1.9], [610, 600, 1.9], [380, 573, 1.55], [535, 575, 1.55]])
    expect(WIDE_COW_SPOTS).toEqual([[900, 644, 1.9], [1060, 650, 1.9], [1215, 644, 1.9], [985, 606, 1.55], [1140, 608, 1.55]])
    const a = wideSceneAnimals({ kind: 'play', bulls: 5, cows: 5 })
    expect(a).toHaveLength(10)
    for (const x of a) {
      const table = x.kind === 'bull' ? WIDE_BULL_SPOTS : WIDE_COW_SPOTS
      expect(table.map(([sx, sy, s]) => `${sx},${sy},${s}`)).toContain(`${x.x},${x.y},${x.scale}`)
    }
  })

  it('idle matches the design: two bulls and two cows, back-to-front, back row at scale 1.55', () => {
    const a = wideSceneAnimals({ kind: 'idle' })
    expect(a.map((x) => [x.kind, x.x, x.y, x.scale, x.delay])).toEqual([
      ['bull', 535, 575, 1.55, '-1.3s'],
      ['bull', 300, 600, 1.9, '0s'],
      ['cow', 985, 606, 1.55, '-3s'],
      ['cow', 1060, 650, 1.9, '-1s'],
    ])
    expect(a.every((x) => x.motion === 'idle')).toBe(true)
  })

  it('play runs the bulls in and walks the cows in with the prototype delays', () => {
    const a = wideSceneAnimals({ kind: 'play', bulls: 2, cows: 2 })
    expect(a.filter((x) => x.kind === 'bull').map((x) => [x.motion, x.delay])).toEqual([['run', '0s'], ['run', '0.16s']])
    expect(a.filter((x) => x.kind === 'cow').map((x) => [x.motion, x.delay])).toEqual([['walk', '0.35s'], ['walk', '0.57s']])
    expect(a.map((x) => x.y)).toEqual([...a.map((x) => x.y)].sort((p, q) => p - q))
  })

  it('result (win) stands the bulls idle on the wide spots plus one cow', () => {
    const a = wideSceneAnimals({ kind: 'result', bulls: 4 })
    const bulls = a.filter((x) => x.kind === 'bull')
    expect(bulls).toHaveLength(4)
    expect(bulls.every((x) => x.motion === 'idle')).toBe(true)
    expect(bulls.map((x) => x.delay).sort()).toEqual(['-0.7s', '-1.4s', '-2.1s', '0s'].sort())
    const cows = a.filter((x) => x.kind === 'cow')
    expect(cows).toEqual([{ kind: 'cow', x: 900, y: 644, scale: 1.9, motion: 'idle', delay: '-2s' }])
  })

  it('clamps to 0–5 animals per kind', () => {
    expect(wideSceneAnimals({ kind: 'play', bulls: 9, cows: 9 })).toHaveLength(10)
    expect(wideSceneAnimals({ kind: 'play', bulls: -1, cows: 0 })).toHaveLength(0)
    expect(wideSceneAnimals({ kind: 'result', bulls: 0 })).toHaveLength(1)
  })
})
