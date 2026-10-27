import { PASTURE_KEYS } from '@bc/game-core'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PastureScene } from '../PastureScene'
import { sceneAnimals, wideSceneAnimals } from '../sceneAnimals'
import { WIDE_VIEWBOX, WideScene } from '../WideScene'
import type { ScenePasture } from './types'

vi.mock('../../../hooks/useReducedMotion', () => ({ useReducedMotion: () => false }))

const base = { fog: 0, sunY: 90, dawn: 0.1, animals: sceneAnimals({ kind: 'play', bulls: 5, cows: 5 }), parity: true, miss: false }
const ALL: ScenePasture = { shown: [...PASTURE_KEYS], barnColor: 'blue' }

/** Document order: negative when `a` comes before `b`. */
const before = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

describe('rewards in the phone scene', () => {
  it('draws nothing extra without a pasture', () => {
    const { container } = render(<PastureScene {...base} />)
    expect(container.querySelector('[data-reward]')).toBeNull()
  })

  it('draws each shown reward in its layer: behind, in the pen (before the animals) and in front', () => {
    const { container } = render(<PastureScene {...base} pasture={ALL} />)
    const plane = (name: string) => container.querySelector(`[data-plane="${name}"]`)!
    const inPlane = (name: string) => [...plane(name).querySelectorAll('[data-reward]')].map((e) => e.getAttribute('data-reward'))
    expect(inPlane('land').sort()).toEqual(['barnColor', 'beehive', 'goldenVane', 'rooster', 'shed', 'windmill'])
    expect(inPlane('animals')).toEqual(['sunflowers', 'dog'])
    expect(inPlane('front')).toEqual(['pond'])
    const animals = plane('animals').querySelector('[data-layer^="animals"]')!
    expect(before(plane('animals').querySelector('[data-reward="dog"]')!, animals)).toBe(true)
  })

  it('tints the barn walls with hue blending under the animals, the door cut out', () => {
    const { container } = render(<PastureScene {...base} pasture={ALL} />)
    const tint = container.querySelector('[data-reward="barnColor"]') as SVGPathElement
    expect(tint.getAttribute('fill')).toBe('#3B76B8')
    expect(tint.getAttribute('fill-rule')).toBe('evenodd')
    expect(tint.style.mixBlendMode).toBe('hue')
    expect(tint.getAttribute('d')).toContain('M46 219 L46 263 L94 263 L94 219Z')
    expect(tint.querySelector('.rig')).toBeNull()
    for (const rig of container.querySelectorAll('.rig')) expect(before(tint, rig)).toBe(true)
  })

  it('keeps the red barn as drawn and hides what the player switched off', () => {
    const { container } = render(<PastureScene {...base} pasture={{ shown: ['dog'], barnColor: 'red' }} />)
    expect([...container.querySelectorAll('[data-reward]')].map((e) => e.getAttribute('data-reward'))).toEqual(['dog'])
  })

  it('animates with the pw-* loops the idle freeze and reduced motion stop', () => {
    const { container } = render(<PastureScene {...base} pasture={ALL} />)
    for (const cls of ['pw-sails', 'pw-duck', 'pw-tailwag', 'pw-nod', 'pw-bees', 'pw-vane']) {
      expect(container.querySelector(`.${cls}`)).not.toBeNull()
    }
  })
})

describe('rewards in the wide scene', () => {
  const wide = { ...base, animals: wideSceneAnimals({ kind: 'idle' }), tally: { b: 0, c: 0 }, viewBox: WIDE_VIEWBOX.immersive }

  it('draws the rewards around the pen, the tint inside the barn and before the animals', () => {
    const { container } = render(<WideScene {...wide} pasture={ALL} />)
    const keys = [...container.querySelectorAll('[data-reward]')].map((e) => e.getAttribute('data-reward'))
    expect(keys.sort()).toEqual([...PASTURE_KEYS].sort())
    const tint = container.querySelector('[data-reward="barnColor"]')!
    const animals = container.querySelector('[data-layer^="animals"]')!
    expect(before(tint, animals)).toBe(true)
    expect(animals.contains(tint)).toBe(false)
    expect(before(animals, container.querySelector('[data-reward="dog"]')!)).toBe(true)
  })

  it('swaps the plain weathervane for the golden one', () => {
    const plain = render(<WideScene {...wide} />)
    expect(plain.container.querySelector('.ps-vane')).not.toBeNull()
    plain.unmount()
    const { container } = render(<WideScene {...wide} pasture={{ shown: ['goldenVane'], barnColor: 'red' }} />)
    expect(container.querySelector('.ps-vane')).toBeNull()
    expect(container.querySelector('[data-reward="goldenVane"] .pw-vane')).not.toBeNull()
  })
})
