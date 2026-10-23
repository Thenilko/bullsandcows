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
    // The drawing is stacked svgs on the same viewBox (sky, land, animals, front) so the sun's rays and the
    // animals' motion repaint only their own plane; the sky sprites are small svgs inside the HTML sky layer.
    const svgs = [...img.querySelectorAll(':scope > svg')]
    expect(svgs.map((s) => s.getAttribute('data-plane'))).toEqual(['sky', 'land', 'animals', 'front'])
    for (const svg of svgs) {
      expect(svg.getAttribute('viewBox')).toBe('0 0 390 380')
      expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice')
    }
    expect(svgs[0]!.querySelector('.ps-rays')).not.toBeNull()
    for (const i of [0, 1, 3]) expect(svgs[i]!.querySelector('.rig')).toBeNull()
    // Paint order: sky and sun first, fog last.
    const layers = [...img.querySelectorAll('[data-layer]')].map((e) => e.getAttribute('data-layer'))
    expect(layers.indexOf('sun')).toBeLessThan(layers.indexOf('animals-A'))
    expect(layers.at(-1)).toBe('fog')
    expect(img.lastElementChild!.getAttribute('data-layer')).toBe('fog')
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

  it('draws the fog as an HTML layer over the svg: no filter, and its drift is a composited transform, not an svg repaint', () => {
    const { container } = render(<PastureScene {...base} />)
    expect(container.querySelectorAll('feGaussianBlur').length).toBe(0)
    expect(container.querySelectorAll('svg [data-layer="fog"]').length).toBe(0)
    const fog = container.querySelector('div[data-layer="fog"]') as HTMLElement
    expect(fog.style.opacity).toBe('0.4')
    expect(fog.querySelectorAll('.ps-fogb').length).toBe(3)
    const blob = fog.querySelector('.ps-fogb') as HTMLElement
    // Artboard units (390x380) as percentages of the box, so the layer follows the svg's `.art` sizing.
    expect(blob.style.left).toMatch(/%$/)
    expect(blob.style.width).toMatch(/%$/)
    expect(blob.style.getPropertyValue('--fog-shift')).toMatch(/%$/)
  })

  it('moves clouds and birds in an HTML layer over the drawing, under the fog, so their drift never repaints the svg', () => {
    const { container } = render(<PastureScene {...base} />)
    for (const drawing of container.querySelectorAll('[role="img"] > svg')) {
      expect(drawing.querySelectorAll('.ps-cloud, .ps-bird').length).toBe(0)
    }
    const sky = container.querySelector('div[data-layer="sky"]') as HTMLElement
    expect(sky.querySelectorAll('.ps-cloud').length).toBe(3)
    expect(sky.querySelectorAll('.ps-bird').length).toBe(2)
    const layers = [...container.querySelectorAll('[role="img"] > [data-layer]')].map((e) => e.getAttribute('data-layer'))
    expect(layers).toEqual(['sky', 'fog'])
    expect(container.querySelector('[role="img"] > svg[data-plane="sky"] + [data-layer="sky"] + svg[data-plane="land"]')).not.toBeNull()
    const cloud = sky.querySelector('.ps-cloud') as HTMLElement
    expect(cloud.style.top).toMatch(/%$/)
    expect(cloud.style.width).toMatch(/%$/)
  })

  it('parks clouds and birds at their still spots under reduced motion', () => {
    reduced.value = true
    const { container } = render(<PastureScene {...base} />)
    const sky = container.querySelector('div[data-layer="sky"]') as HTMLElement
    expect(sky.querySelectorAll('.ps-sprite').length).toBe(5)
    expect(sky.querySelectorAll('.ps-cloud, .ps-bird').length).toBe(0)
    expect((sky.querySelector('.ps-sprite') as HTMLElement).style.transform).toMatch(/^translateX\(-?[\d.]+%\)$/)
  })

  it('keeps the fog blobs still under reduced motion', () => {
    reduced.value = true
    const { container } = render(<PastureScene {...base} />)
    expect(container.querySelectorAll('div[data-layer="fog"] .ps-fogb').length).toBe(0)
    expect(container.querySelectorAll('div[data-layer="fog"] .ps-fogs').length).toBe(3)
  })
})
