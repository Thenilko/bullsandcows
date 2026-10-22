import type { GameViewDto, MeDto } from '@bc/protocol'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fallbackDistribution, wonGame } from '../test/fixtures'
import { renderWithI18n } from '../test/render'
import { IMMERSIVE, mockViewport, resetViewport, SPLIT } from '../test/viewport'

const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn() }
vi.mock('../features/auth/client', () => ({ api }))
vi.mock('../hooks/useIsDesktop', () => ({ useIsDesktop: () => true }))

const { Play } = await import('./Play')
const { Result } = await import('./Result')
const { useSession } = await import('../features/auth/session')
const { useSolo } = await import('../features/solo/store')

const started: GameViewDto = {
  id: 'g1',
  kind: 'free',
  len: 4,
  zero: false,
  practice: false,
  total: 3024,
  startedAt: Date.now() - 5000,
  finishedAt: null,
  won: null,
  score: null,
  attempts: 0,
  guesses: [],
}
const ME = { profile: { vibrate: false, sound: false, defaultLen: 4 }, currentGameId: null } as unknown as MeDto

function serve(game: GameViewDto) {
  api.get.mockImplementation(async (path: string) => {
    if (path.startsWith('/api/games/')) return game
    if (path.startsWith('/api/stats/distribution')) return fallbackDistribution
    throw new Error(`unexpected GET ${path}`)
  })
}

function show(at: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderWithI18n(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path="/play/:gameId" element={<Play />} />
          <Route path="/result/:gameId" element={<Result />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const digitGrid = (container: HTMLElement) =>
  (container.querySelector('.dk-notes .note') as HTMLElement).parentElement as HTMLElement

beforeEach(() => {
  vi.clearAllMocks()
  useSolo.setState({ ui: {} })
  useSession.setState({ session: null, me: ME })
})
afterEach(resetViewport)

describe('Play on the desktop', () => {
  it('immersive: the board hangs on two ropes in the middle and the notebook is a 5×2 sheet without the hint', async () => {
    mockViewport(...IMMERSIVE)
    serve(started)
    const { container } = show('/play/g1')
    await screen.findByLabelText('Цифра 1')
    expect(container.querySelector('.dk')).toHaveClass('dk-imm', 'sc-play')
    const play = container.querySelector('main.dk-col > .dk-play') as HTMLElement
    expect(play).not.toBeNull()
    expect(play.querySelector('.dk-rope.dk-rope-l')).toHaveAttribute('aria-hidden', 'true')
    expect(play.querySelector('.dk-rope.dk-rope-r')).not.toBeNull()
    expect(screen.getByRole('region', { name: 'Въвеждане на число' })).toHaveClass('card', 'dk-game')
    expect(screen.getByRole('region', { name: 'Тефтерче' })).toHaveClass('card', 'dk-notes')
    expect(digitGrid(container).style.gridTemplateColumns).toBe('repeat(5, minmax(0, 1fr))')
    expect(screen.queryByText(/^цъкни/)).toBeNull()
  })

  it('split: the board and the notebook stack in the column, digits in one row of 10', async () => {
    mockViewport(...SPLIT)
    serve(started)
    const { container } = show('/play/g1')
    await screen.findByLabelText('Цифра 1')
    expect(container.querySelector('.dk')).toHaveClass('dk-split', 'sc-play')
    const main = container.querySelector('main.dk-col') as HTMLElement
    expect(main.querySelector('.dk-game')).not.toBeNull()
    expect(main.querySelector('.dk-notes')).not.toBeNull()
    expect(digitGrid(container).style.gridTemplateColumns).toBe('repeat(10, minmax(0, 1fr))')
    expect(screen.getByText(/^цъкни/)).toBeInTheDocument()
  })

  it('keeps the hud chips (fog, clock) over the scene, outside the column', async () => {
    mockViewport(...IMMERSIVE)
    serve(started)
    const { container } = show('/play/g1')
    await screen.findByLabelText('Цифра 1')
    const hud = container.querySelector('.dk > .dk-hud') as HTMLElement
    expect(hud.textContent).toMatch(/Мъгла/)
    expect(hud.closest('main')).toBeNull()
  })

  it('result: the modal sits above everything and there is no board or notebook', async () => {
    mockViewport(...IMMERSIVE)
    serve(wonGame)
    const { container } = show('/result/g1')
    const sheet = await screen.findByRole('region', { name: 'Резултат' })
    expect(container.querySelector('.dk')).toHaveClass('sc-result')
    expect(container.querySelector('.dk-game')).toBeNull()
    expect(container.querySelector('.dk-notes')).toBeNull()
    expect(sheet.style.zIndex).toBe('20')
    expect(screen.getByTestId('result-overlay').style.zIndex).toBe('19')
    expect((container.querySelector('.confetti') as HTMLElement).parentElement?.parentElement?.style.zIndex).toBe('21')
  })
})
