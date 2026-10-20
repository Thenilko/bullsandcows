import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { IDLE_SCENE } from '../../screens/idleScene'
import { renderWithI18n } from '../../test/render'
import { DesktopShell } from './DesktopShell'
import { MobileShell } from './MobileShell'

describe.each([
  ['MobileShell', MobileShell],
  ['DesktopShell', DesktopShell],
] as const)('%s', (_n, Comp) => {
  it('shows the four nav links by default', () => {
    renderWithI18n(
      <MemoryRouter>
        <Comp scene={IDLE_SCENE}>x</Comp>
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link')).toHaveLength(4)
  })

  it('hides the nav when bare', () => {
    renderWithI18n(
      <MemoryRouter>
        <Comp scene={IDLE_SCENE} bare>
          x
        </Comp>
      </MemoryRouter>,
    )
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})
