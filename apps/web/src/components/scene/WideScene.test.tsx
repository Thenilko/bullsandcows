import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WideScene, WIDE_VIEWBOX } from './WideScene'
import { wideSceneAnimals } from './sceneAnimals'
import { tallyHeads } from './wide/Tally'

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => reduced.value }))

const base = {
  fog: 0.3,
  sunY: 172,
  dawn: 0.1,
  animals: wideSceneAnimals({ kind: 'idle' }),
  parity: true,
  miss: false,
  tally: { b: 2, c: 1 },
  viewBox: WIDE_VIEWBOX.immersive,
}
const INFINITE = ['ps-cloudw', 'ps-birdw', 'ps-fogb', 'ps-rays', 'ps-smoke', 'sc-sway']

function heads(container: Element): string[] {
  return [...container.querySelectorAll('[data-tally]')].map((e) => e.getAttribute('data-tally')!)
}

describe('WideScene', () => {
  beforeEach(() => {
    reduced.value = false
  })

  it('renders one accessible svg on the requested crop of the 1600×900 artboard, anchored to the bottom', () => {
    const { container } = render(<WideScene {...base} label="Wide pasture" />)
    expect(container.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Wide pasture')
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
    expect(svgs[0]!.getAttribute('viewBox')).toBe('80 0 1440 900')
    expect(svgs[0]!.getAttribute('preserveAspectRatio')).toBe('xMidYMax slice')
  })

  it('applies the split crop when asked', () => {
    const { container } = render(<WideScene {...base} viewBox={WIDE_VIEWBOX.split} />)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('200 200 1160 700')
  })

  it('exports the two desktop crops of the spec', () => {
    expect(WIDE_VIEWBOX).toEqual({ immersive: '80 0 1440 900', split: '200 200 1160 700' })
  })

  it('paints sky, sign and animals before the front rail and the fog last', () => {
    const { container } = render(<WideScene {...base} />)
    const layers = [...container.querySelectorAll('[data-layer]')].map((e) => e.getAttribute('data-layer'))
    expect(layers.indexOf('sun')).toBeLessThan(layers.indexOf('tally'))
    expect(layers.indexOf('tally')).toBeLessThan(layers.indexOf('animals-A'))
    expect(layers.at(-1)).toBe('fog')
    expect((container.querySelector('[data-layer="sun"]') as HTMLElement).style.transform).toBe('translate(1240px, 172px)')
    expect((container.querySelector('[data-layer="fog"]') as HTMLElement).style.opacity).toBe('0.3')
  })

  it('shows 2 bulls and 1 cow on the tally sign as three heads', () => {
    const { container } = render(<WideScene {...base} />)
    expect(heads(container)).toEqual(['bull', 'bull', 'cow'])
    expect(container.querySelector('.pw-sign')).not.toBeNull()
  })

  it('shows an X on the sign for 0 bulls and 0 cows', () => {
    const { container } = render(<WideScene {...base} tally={{ b: 0, c: 0 }} />)
    expect(heads(container)).toEqual(['none'])
  })

  it('places the wide rigs with their wide transforms', () => {
    const { container } = render(<WideScene {...base} animals={wideSceneAnimals({ kind: 'play', bulls: 1, cows: 0 })} />)
    const g = container.querySelector('[data-layer="animals-A"] > g') as SVGGElement
    expect(g.getAttribute('transform')).toBe('translate(300 600) scale(1.9)')
    expect(g.querySelector('.rig-b')).not.toBeNull()
    expect(container.querySelectorAll('#rigCowClip')).toHaveLength(1)
  })

  it('draws the scenery of the design: house with smoke, well, barn with vane, scarecrow, both rails', () => {
    const { container } = render(<WideScene {...base} />)
    expect(container.querySelector('.ps-smoke')).not.toBeNull()
    expect(container.querySelector('.ps-vane')).not.toBeNull()
    expect(container.querySelector('.sc-sway')).not.toBeNull()
    expect(container.querySelectorAll('rect[width="610"]')).toHaveLength(4)
    expect(container.querySelectorAll('[fill="url(#psCanopy)"]').length).toBeGreaterThanOrEqual(8)
  })

  it('shows dust puffs only on a miss', () => {
    expect(render(<WideScene {...base} />).container.querySelector('.ps-puff')).toBeNull()
    expect(render(<WideScene {...base} miss />).container.querySelectorAll('.ps-puff')).toHaveLength(3)
  })

  it('drops the infinite animation classes under reduced motion but keeps the shapes', () => {
    reduced.value = true
    const { container } = render(<WideScene {...base} />)
    for (const c of INFINITE) expect(container.querySelector('.' + c)).toBeNull()
    expect(container.querySelectorAll('ellipse').length).toBeGreaterThan(20)
  })
  it('draws the fog without an SVG filter (the blur is re-rasterized every frame on the CPU in WebKit)', () => {
    const { container } = render(<WideScene {...base} />)
    expect(container.querySelectorAll('feGaussianBlur').length).toBe(0)
    expect(container.querySelectorAll('[data-layer="fog"] [filter]').length).toBe(0)
    expect(container.querySelectorAll('[data-layer="fog"] .ps-fogb').length).toBe(4)
  })

})

describe('tallyHeads', () => {
  it('lists bulls then cows and clamps bad counts', () => {
    expect(tallyHeads({ b: 1, c: 3 })).toEqual(['bull', 'cow', 'cow', 'cow'])
    expect(tallyHeads({ b: -2, c: 0.9 })).toEqual(['none'])
    expect(tallyHeads({ b: 9, c: Number.NaN })).toHaveLength(5)
  })
})
