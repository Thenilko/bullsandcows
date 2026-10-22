import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BullHead, BullIcon, CowHead, CowIcon, ScarecrowIcon } from './characters'

describe('character icons', () => {
  it.each([
    ['bull', <BullIcon size={22} />],
    ['cow', <CowIcon size={22} />],
    ['scarecrow', <ScarecrowIcon size={22} />],
  ])('%s is a decorative svg of the given size without any id or clipPath', (_, icon) => {
    const { container } = render(icon)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('width', '22')
    expect(svg).toHaveAttribute('viewBox', '-62 -66 124 124')
    expect(container.querySelectorAll('[id]')).toHaveLength(0)
    expect(container.querySelector('clipPath')).toBeNull()
    expect(container.querySelector('[clip-path]')).toBeNull()
  })

  it('renders the cow many times on a page without duplicate ids', () => {
    const { container } = render(
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <CowIcon key={i} />
        ))}
      </>,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(12)
    expect(container.querySelectorAll('[id]')).toHaveLength(0)
  })

  it('draws the calf with horn buds, big eyes and no nose ring', () => {
    const adult = render(
      <svg>
        <BullHead />
      </svg>,
    )
    const calf = render(
      <svg>
        <BullHead calf />
      </svg>,
    )
    expect(adult.container.querySelector('[data-head="bull"]')).not.toBeNull()
    expect(calf.container.querySelector('[data-head="calf"]')).not.toBeNull()
    expect(adult.container.querySelector('circle[r="6.5"]')).not.toBeNull()
    expect(calf.container.querySelector('circle[r="8.2"]')).not.toBeNull()
    expect(adult.container.querySelector('path[stroke="#E2B44A"]')).not.toBeNull()
    expect(calf.container.querySelector('path[stroke="#E2B44A"]')).toBeNull()
  })

  it('keeps the cow calf spotted', () => {
    const { container } = render(
      <svg>
        <CowHead calf />
      </svg>,
    )
    expect(container.querySelector('[data-head="calf"]')).not.toBeNull()
    expect(container.querySelectorAll('path[fill="#26262B"]').length).toBeGreaterThanOrEqual(3)
  })
})
