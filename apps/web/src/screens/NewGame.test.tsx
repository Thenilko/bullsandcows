import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { MeDto } from '@bc/protocol'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn() }
vi.mock('../features/auth/client', () => ({ api }))

const { NewGame } = await import('./NewGame')
const { useSession } = await import('../features/auth/session')

const meWith = (currentGameId: string | null) =>
  ({ profile: { defaultLen: 4, sound: true, vibrate: false }, currentGameId }) as unknown as MeDto

let client: QueryClient

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function show() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderWithI18n(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/new']}>
        <Routes>
          <Route path="/new" element={<NewGame />} />
          <Route path="/play/:gameId" element={<p>play page</p>} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useSession.setState({ session: null, me: meWith(null) })
  api.get.mockResolvedValue({ histogram: [0, 0, 10, 10], sample: 20, fallback: true })
})

describe('NewGame', () => {
  it('defaults to the profile length, no zero, daily and shows the average', async () => {
    show()
    expect(screen.getByRole('button', { name: '4' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('switch', { name: 'Разреши цифрата 0' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('button', { name: 'Дневно' })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('4 цифри · числото на деня · средно 3.5 опита')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/api/stats/distribution?len=4&zero=false&kind=daily')
  })

  it('creates the game with the chosen settings and opens it', async () => {
    api.post.mockResolvedValue({ id: 'new1' })
    show()
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Разреши цифрата 0' }))
    fireEvent.click(screen.getByRole('button', { name: 'Свободно' }))
    fireEvent.click(screen.getByRole('button', { name: 'Старт' }))
    expect(await screen.findByText('play page')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/api/games', { len: 5, zero: true, kind: 'free' })
  })

  it('invalidates the cached profile after creating a game', async () => {
    api.post.mockResolvedValue({ id: 'new1' })
    show()
    const spy = vi.spyOn(client, 'invalidateQueries')
    fireEvent.click(screen.getByRole('button', { name: 'Старт' }))
    await screen.findByText('play page')
    expect(spy).toHaveBeenCalledWith({ queryKey: ['me'] })
  })

  it('offers to continue the unfinished game', async () => {
    useSession.setState({ me: meWith('g9') })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Продължи' }))
    await waitFor(() => expect(screen.getByText('play page')).toBeInTheDocument())
  })

  it('shows the translated error when creating fails', async () => {
    const { ApiError } = await import('../lib/api')
    api.post.mockRejectedValue(new ApiError('ERR_RATE_LIMIT', 429))
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Старт' }))
    expect(await screen.findByText('Много бързаш — изчакай малко и опитай пак.')).toBeInTheDocument()
  })

  it('marks solo in the mode switch and navigates to the duel and bot setups', () => {
    show()
    expect(screen.getByRole('button', { name: /^Соло/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /^Дуел/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('/duel/new')
  })

  it('the bot tab opens the bot setup', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: /^Срещу бот/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('/bot/new')
  })
})
