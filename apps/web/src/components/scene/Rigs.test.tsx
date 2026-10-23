import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { Bull } from './Bull'
import { Cow } from './Cow'

function mount(rig: ReactElement): Element {
  return render(<svg>{rig}</svg>).container
}

const LEGS = ['nf', 'ff', 'nh', 'fh'] as const

describe('animal rigs', () => {
  it.each([
    ['bull', <Bull key="b" />, 'rig-b'],
    ['cow', <Cow key="c" />, 'rig-c'],
  ])('%s is a rig with four legs with lower parts, a body, a head and a tail', (_name, rig, cls) => {
    const c = mount(rig)
    const root = c.querySelector('.rig')!
    expect(root.getAttribute('class')).toBe(`rig ${cls}`)
    expect(root.querySelectorAll('.rig-body')).toHaveLength(1)
    for (const leg of LEGS) {
      expect(c.querySelectorAll(`.rig-body > .leg.${leg}`)).toHaveLength(1)
      expect(c.querySelectorAll(`.leg.${leg} > .low`)).toHaveLength(1)
    }
    expect(c.querySelectorAll('.rig-tail')).toHaveLength(1)
    expect(c.querySelectorAll('.rig-head')).toHaveLength(1)
  })

  it('keeps the 80×56 animal box: the 160×112 drawing is scaled by .5', () => {
    expect(mount(<Bull />).querySelector('.rig')!.getAttribute('transform')).toBe('scale(.5)')
    expect(mount(<Cow />).querySelector('.rig')!.getAttribute('transform')).toBe('scale(.5)')
  })

  it('legs carry no transform attribute, so the CSS rotations apply from the hip', () => {
    for (const el of mount(<Bull />).querySelectorAll('.leg, .low')) expect(el.getAttribute('transform')).toBeNull()
  })

  it('draws the character heads at scale .58 inside rig-head', () => {
    for (const rig of [<Bull key="b" />, <Cow key="c" />]) {
      const head = mount(rig).querySelector('.rig-head > g')!
      expect(head.getAttribute('transform')).toMatch(/^translate\(32 (39|40)\) scale\(\.58\)$/)
      expect(head.querySelectorAll('circle').length).toBeGreaterThanOrEqual(6)
    }
  })

  it('bull has dust and no udder; cow has an udder, clipped spots and no dust', () => {
    const bull = mount(<Bull />)
    expect(bull.querySelectorAll('.rig-dust circle')).toHaveLength(3)
    expect(bull.querySelector('.rig-udder')).toBeNull()
    const cow = mount(<Cow />)
    expect(cow.querySelector('.rig-udder')).not.toBeNull()
    expect(cow.querySelector('.rig-dust')).toBeNull()
    expect(cow.querySelectorAll('[clip-path="url(#rigCowClip)"] path')).toHaveLength(3)
  })

  it('uses flat colours with the #2E3B24 outline of width 3.4 and no gradients', () => {
    for (const rig of [<Bull key="b" />, <Cow key="c" />]) {
      const c = mount(rig)
      expect(c.innerHTML).not.toContain('url(#ps')
      const outlined = [...c.querySelectorAll('[stroke="#2E3B24"][stroke-width="3.4"]')]
      expect(outlined.length).toBeGreaterThanOrEqual(13)
    }
  })
})
