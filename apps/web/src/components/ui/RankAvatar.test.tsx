import { RANK_KEYS } from '@bc/game-core'
import type { RankKey } from '@bc/protocol'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { RANK_RING, RankAvatar, RankHead, type Species } from './RankAvatar'

const SPECIES: readonly Species[] = ['bull', 'cow']
const SPECIES_BG: Readonly<Record<Species, string>> = { bull: 'Бик', cow: 'Крава' }
const RANK_BG: Readonly<Record<RankKey, string>> = {
  calf: 'Теленце',
  herdsman: 'Говедар',
  shepherd: 'Овчар',
  pastor: 'Пастир',
  steward: 'Стопанин',
  chiefBull: 'Главен бик',
}
/** Which accessories each title wears (the calf wears none). */
const ACCESSORIES: Readonly<Record<RankKey, readonly string[]>> = {
  calf: [],
  herdsman: ['bell'],
  shepherd: ['scarf'],
  pastor: ['bell', 'wreath'],
  steward: ['scarf', 'hat'],
  chiefBull: ['bell', 'crown'],
}
const RING: Readonly<Record<RankKey, string>> = {
  calf: '#C9C2B0',
  herdsman: '#C48E55',
  shepherd: '#5E9E46',
  pastor: '#4A7FB0',
  steward: '#8E5BA8',
  chiefBull: '#E2B44A',
}

const combos = SPECIES.flatMap((species) => RANK_KEYS.map((rankKey) => [species, rankKey] as const))

function accessoriesOf(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-accessory]')].map((n) => n.getAttribute('data-accessory') ?? '')
}

describe('RankAvatar', () => {
  it.each(combos)('%s × %s is labelled „вид, титла“ and wears the right accessory', (species, rankKey) => {
    const { container } = renderWithI18n(<RankAvatar species={species} rankKey={rankKey} size={48} />)
    const img = screen.getByRole('img', { name: `${SPECIES_BG[species]}, ${RANK_BG[rankKey]}` })
    expect(img).toHaveAttribute('width', '48')
    expect(container.querySelector(`[data-rank="${rankKey}"]`)).not.toBeNull()
    expect(accessoriesOf(container)).toEqual(ACCESSORIES[rankKey])
    expect(container.querySelector(`[data-head="${rankKey === 'calf' ? 'calf' : species}"]`)).not.toBeNull()
    expect(container.querySelector('circle[r="76"]')).toHaveAttribute('fill', RING[rankKey])
    expect(container.querySelectorAll('[id]')).toHaveLength(0)
  })

  it('exports the ring colours of the design board', () => {
    expect(RANK_RING).toEqual(RING)
  })

  it('tints the inner disc per species', () => {
    const bull = renderWithI18n(<RankAvatar species="bull" rankKey="herdsman" />)
    expect(bull.container.querySelector('circle[r="66"]')).toHaveAttribute('fill', '#D7EBF5')
    const cow = renderWithI18n(<RankAvatar species="cow" rankKey="herdsman" />)
    expect(cow.container.querySelector('circle[r="66"]')).toHaveAttribute('fill', '#DCEBCF')
  })

  it('shrinks the calf and keeps the adult at full size', () => {
    const calf = renderWithI18n(<RankAvatar species="bull" rankKey="calf" />)
    expect(calf.container.querySelector('[data-rank="calf"]')).toHaveAttribute('transform', 'scale(0.86)')
    const adult = renderWithI18n(<RankAvatar species="bull" rankKey="steward" />)
    expect(adult.container.querySelector('[data-rank="steward"]')).not.toHaveAttribute('transform')
  })

  it('rocks with the think animation only while thinking', () => {
    const still = renderWithI18n(<RankAvatar species="cow" rankKey="shepherd" />)
    expect(still.container.querySelector('.rav')).not.toHaveClass('think')
    const busy = renderWithI18n(<RankAvatar species="cow" rankKey="shepherd" thinking />)
    expect(busy.container.querySelector('.rav')).toHaveClass('think')
  })

  it('translates the label', async () => {
    const { default: i18n } = await import('../../i18n')
    await i18n.changeLanguage('en')
    render(<RankAvatar species="cow" rankKey="chiefBull" />)
    expect(screen.getByRole('img', { name: 'Cow, Chief Bull' })).toBeInTheDocument()
    await i18n.changeLanguage('bg')
  })
})

describe('RankHead', () => {
  it('is a decorative head with the accessory and no ring, taller than wide', () => {
    const { container } = render(<RankHead species="bull" rankKey="chiefBull" size={40} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('data-rank-head', 'chiefBull')
    expect(svg).toHaveAttribute('width', '40')
    expect(svg).toHaveAttribute('height', '43')
    expect(container.querySelector('circle[r="76"]')).toBeNull()
    expect(accessoriesOf(container)).toEqual(['bell', 'crown'])
  })
})
