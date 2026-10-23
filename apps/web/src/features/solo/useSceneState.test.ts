import { IDLE_PROGRESS } from '@bc/game-core'
import type { GameViewDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { sceneFor } from './useSceneState'

const game: GameViewDto = {
  id: 'g',
  kind: 'free',
  len: 4,
  zero: false,
  practice: false,
  total: 3024,
  startedAt: 1,
  finishedAt: null,
  won: null,
  score: null,
  attempts: 0,
  guesses: [],
}
const ui = { parity: true, miss: false }

describe('sceneFor', () => {
  it('is calm before the start', () => {
    const s = sceneFor(game, false, ui)
    expect(s.fog).toBe(IDLE_PROGRESS.fog)
    expect(s.animals.every((a) => a.motion === 'idle')).toBe(true)
  })

  it('is full fog with no guesses once started', () => {
    expect(sceneFor(game, true, ui).fog).toBeCloseTo(0.9)
  })

  it('lifts the fog and runs the bulls after a verdict', () => {
    const g = { ...game, guesses: [{ guess: '1234', bulls: 2, cows: 1, consistent: true, left: 67 }] }
    const s = sceneFor(g, true, ui)
    expect(s.fog).toBeLessThan(0.9)
    expect(s.animals.filter((a) => a.kind === 'bull' && a.motion === 'run')).toHaveLength(2)
    expect(s.animals.filter((a) => a.kind === 'cow' && a.motion === 'walk')).toHaveLength(1)
  })

  it('clears the fog when solved', () => {
    const g = { ...game, guesses: [{ guess: '1234', bulls: 4, cows: 0, consistent: true, left: 1 }] }
    expect(sceneFor(g, true, ui).fog).toBe(0)
  })

  it('passes parity and miss through', () => {
    expect(sceneFor(game, true, { parity: false, miss: true })).toMatchObject({ parity: false, miss: true })
  })
})
