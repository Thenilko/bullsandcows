import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PastureScene } from './PastureScene'
import { sceneAnimals } from './sceneAnimals'

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => reduced.value }))

const base = { fog: 0.4, sunY: 90, dawn: 0.2, animals: sceneAnimals({ kind: 'idle' }), parity: true, miss: false }
const INFINITE = ['ps-drift', 'ps-fly', 'ps-fog', 'ps-rays', 'ps-cloud', 'ps-bird', 'ps-fogb']

describe('PastureScene', () => {
  beforeEach(() => {
    reduced.value = false
  })

  it('renders an accessible image: one svg on the design viewBox, centred slice as PasScene', () => {
    const { container } = render(<PastureScene {...base} label="Pasture" />)
    const img = container.querySelector('[role="img"]')!
    expect(img.getAttribute('aria-label')).toBe('Pasture')
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
    expect(svgs[0]!.getAttribute('viewBox')).toBe('0 0 390 380')
    expect(svgs[0]!.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice')
    // Paint order: sky and sun first, fog last.
    const layers = [...svgs[0]!.querySelectorAll('[data-layer]')].map((e) => e.getAttribute('data-layer'))
    expect(layers.indexOf('sun')).toBeLessThan(layers.indexOf('animals-A'))
    expect(layers.at(-1)).toBe('fog')
  })

  it('wires fog opacity, sun position and dawn opacity', () => {
    const { container } = render(<PastureScene {...base} />)
    expect((container.querySelector('[data-layer="fog"]') as HTMLElement).style.opacity).toBe('0.4')
    expect((container.querySelector('[data-layer="sun"]') as HTMLElement).style.transform).toBe('translate(322px, 90px)')
    expect((container.querySelector('[data-layer="dawn"]') as HTMLElement).style.opacity).toBe('0.2')
  })

  it('renders animals in the layer chosen by parity', () => {
    const a = render(<PastureScene {...base} parity />)
    expect(a.container.querySelectorAll('[data-layer="animals-A"] .rig-b')).toHaveLength(2)
    expect(a.container.querySelector('[data-layer="animals-B"]')).toBeNull()
    const b = render(<PastureScene {...base} parity={false} />)
    expect(b.container.querySelector('[data-layer="animals-A"]')).toBeNull()
    expect(b.container.querySelectorAll('[data-layer="animals-B"] .rig-c')).toHaveLength(2)
  })

  it('defines the cow clip path once however many cows graze', () => {
    const { container } = render(<PastureScene {...base} animals={sceneAnimals({ kind: 'play', bulls: 0, cows: 4 })} />)
    expect(container.querySelectorAll('#rigCowClip')).toHaveLength(1)
    expect(container.querySelectorAll('[clip-path="url(#rigCowClip)"]')).toHaveLength(4)
    expect(container.querySelectorAll('.rig')).toHaveLength(4)
  })

  it('applies transform, motion class and --d to each animal', () => {
    const { container } = render(<PastureScene {...base} animals={sceneAnimals({ kind: 'play', bulls: 1, cows: 0 })} />)
    const g = container.querySelector('[data-layer="animals-A"] > g') as SVGGElement
    expect(g.getAttribute('transform')).toBe('translate(10 290) scale(0.875)')
    const inner = g.firstElementChild as SVGGElement
    expect(inner.getAttribute('class')).toBe('a-run')
    expect(inner.style.getPropertyValue('--d')).toBe('0s')
  })

  it('shows dust puffs only on a miss', () => {
    expect(render(<PastureScene {...base} />).container.querySelector('.ps-puff')).toBeNull()
    expect(render(<PastureScene {...base} miss />).container.querySelectorAll('.ps-puff')).toHaveLength(3)
  })

  it('keeps infinite animation classes when motion is allowed', () => {
    const { container } = render(<PastureScene {...base} />)
    for (const c of ['ps-cloud', 'ps-bird', 'ps-fogb', 'ps-rays']) expect(container.querySelector('.' + c)).not.toBeNull()
  })

  it('drops every infinite animation class under reduced motion but keeps the shapes', () => {
    reduced.value = true
    const { container } = render(<PastureScene {...base} />)
    for (const c of INFINITE) expect(container.querySelector('.' + c)).toBeNull()
    expect(container.querySelectorAll('ellipse').length).toBeGreaterThan(10)
  })
})
