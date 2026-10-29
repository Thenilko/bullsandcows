import { screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { IDLE_SCENE } from '../../screens/idleScene'
import { renderWithI18n } from '../../test/render'
import { useSession } from '../../features/auth/session'
import { meFixture } from '../../test/fixtures'
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
  ['MobileShell', MobileShell, ['Игра', 'Класация', 'Профил', 'Правила']],
  ['DesktopShell', DesktopShell, ['Игра', 'Класация', 'Правила']],
] as const)('%s', (_n, Comp, tabs) => {
  it('shows the nav links (on desktop the profile is the player chip)', () => {
    wrap(
      <Comp scene={IDLE_SCENE} screen="rules">
        x
      </Comp>,
    )
    expect(within(screen.getByRole('navigation')).getAllByRole('link').map((a) => a.textContent)).toEqual(tabs)
  })

  it.each(['/', '/new', '/play/g1', '/result/g1'])('highlights Игра on %s', (at) => {
    wrap(
      <Comp scene={IDLE_SCENE} screen="rules">
        x
      </Comp>,
      at,
    )
    const on = screen.getAllByRole('link').filter((a) => a.classList.contains('on'))
    expect(on).toHaveLength(1)
    expect(on[0]).toHaveTextContent('Игра')
  })

  it('highlights only Класация on /board', () => {
    wrap(
      <Comp scene={IDLE_SCENE} screen="board">
        x
      </Comp>,
      '/board',
    )
    const on = screen.getAllByRole('link').filter((a) => a.classList.contains('on'))
    expect(on).toHaveLength(1)
    expect(on[0]).toHaveTextContent('Класация')
  })

  it('hides the nav when bare', () => {
    wrap(
      <Comp scene={IDLE_SCENE} screen="login" bare>
        x
      </Comp>,
    )
    expect(screen.queryAllByRole('link').filter((a) => !a.classList.contains('skip-link'))).toHaveLength(0)
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})

describe('DesktopShell skip link', () => {
  it('points to the main landmark', () => {
    wrap(
      <DesktopShell scene={IDLE_SCENE} screen="rules">
        x
      </DesktopShell>,
    )
    expect(screen.getByRole('link', { name: 'Към съдържанието' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })
})

describe('DesktopShell „Нова игра“ (PasDuel desktop header)', () => {
  it('offers the new game screen from a running game, since „Игра“ resumes it', () => {
    wrap(
      <DesktopShell scene={IDLE_SCENE} screen="play">
        x
      </DesktopShell>,
      '/play/g1',
    )
    expect(screen.getByRole('button', { name: 'Нова игра' })).toBeInTheDocument()
  })

  it.each(['/new', '/duel/new', '/bot/new'])('is not shown on %s', (at) => {
    wrap(
      <DesktopShell scene={IDLE_SCENE} screen="new">
        x
      </DesktopShell>,
      at,
    )
    expect(screen.queryByRole('button', { name: 'Нова игра' })).toBeNull()
  })

  it('is not shown while signed out', () => {
    wrap(
      <DesktopShell scene={IDLE_SCENE} screen="login" bare>
        x
      </DesktopShell>,
      '/login',
    )
    expect(screen.queryByRole('button', { name: 'Нова игра' })).toBeNull()
  })

  it('shows the PasDuel „· {title}“ after the logo', () => {
    wrap(
      <DesktopShell scene={IDLE_SCENE} screen="duel" title="Дуел · 4 цифри">
        x
      </DesktopShell>,
      '/duel/r1',
    )
    expect(screen.getByText('· Дуел · 4 цифри')).toHaveClass('dk-title')
    expect(screen.getByText('· Дуел · 4 цифри').closest('header')).not.toBeNull()
  })
})

describe('DesktopShell player chip', () => {
  const me = { ...meFixture, profile: { ...meFixture.profile, username: 'Дидо' } }

  it('opens the profile and is marked there', () => {
    useSession.setState({ me })
    wrap(
      <DesktopShell scene={IDLE_SCENE} screen="profile">
        x
      </DesktopShell>,
      '/profile',
    )
    const chip = screen.getByRole('link', { name: 'Профил: Дидо' })
    expect(chip).toHaveAttribute('href', '/profile')
    expect(chip).toHaveClass('on')
    useSession.setState({ me: null })
  })
})
