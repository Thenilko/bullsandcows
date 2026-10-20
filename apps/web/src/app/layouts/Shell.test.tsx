import { screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { IDLE_SCENE } from '../../screens/idleScene'
import { renderWithI18n } from '../../test/render'
import { DesktopShell } from './DesktopShell'
import { MobileShell } from './MobileShell'

function wrap(ui: ReactNode, at = '/') {
  return renderWithI18n(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[at]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe.each([
  ['MobileShell', MobileShell],
  ['DesktopShell', DesktopShell],
] as const)('%s', (_n, Comp) => {
  it('shows the four nav links by default', () => {
    wrap(<Comp scene={IDLE_SCENE}>x</Comp>)
    expect(screen.getAllByRole('link')).toHaveLength(4)
  })

  it.each(['/', '/new', '/play/g1', '/result/g1'])('highlights Игра on %s', (at) => {
    wrap(<Comp scene={IDLE_SCENE}>x</Comp>, at)
    const on = screen.getAllByRole('link').filter((a) => a.classList.contains('on'))
    expect(on).toHaveLength(1)
    expect(on[0]).toHaveTextContent('Игра')
  })

  it('highlights only Класация on /board', () => {
    wrap(<Comp scene={IDLE_SCENE}>x</Comp>, '/board')
    const on = screen.getAllByRole('link').filter((a) => a.classList.contains('on'))
    expect(on).toHaveLength(1)
    expect(on[0]).toHaveTextContent('Класация')
  })

  it('hides the nav when bare', () => {
    wrap(
      <Comp scene={IDLE_SCENE} bare>
        x
      </Comp>,
    )
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})
