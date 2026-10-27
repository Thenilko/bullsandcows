import { screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nudgeFixture } from '../dev/farmFixtures'
import { useSession } from '../features/auth/session'
import { meFixture } from '../test/fixtures'
import { renderWithI18n } from '../test/render'

const get = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: { get: (p: string) => get(p), patch: vi.fn(), post: vi.fn() },
}))

const { Home } = await import('./Home')

function show(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return renderWithI18n(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<p>new game page</p>} />
          <Route path="/play/:gameId" element={<p>play page</p>} />
          <Route path="/today" element={<p>today page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  get.mockReset()
  useSession.setState({ session: null, me: null })
})

describe('Home', () => {
  it('ignores a stale cached profile and waits for the refetch', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['me'], { ...meFixture, currentGameId: null })
    let resolve: (v: unknown) => void = () => undefined
    get.mockReturnValue(new Promise((r) => (resolve = r)))
    show(client)
    expect(screen.queryByText('new game page')).toBeNull()
    resolve({ ...meFixture, currentGameId: 'g9' })
    expect(await screen.findByText('play page')).toBeInTheDocument()
  })

  it('sends a player with an unfinished game back to it', async () => {
    get.mockResolvedValue({ ...meFixture, currentGameId: 'g7' })
    show()
    expect(await screen.findByText('play page')).toBeInTheDocument()
  })

  it('sends everyone else to the new game screen', async () => {
    get.mockResolvedValue({ ...meFixture, currentGameId: null })
    show()
    expect(await screen.findByText('new game page')).toBeInTheDocument()
  })

  it('renders nothing while the profile loads', () => {
    get.mockReturnValue(new Promise(() => undefined))
    show()
    expect(screen.queryByText('new game page')).toBeNull()
    expect(screen.queryByText('play page')).toBeNull()
  })

  it('sends a member with an unread nudge to today’s number (П4)', async () => {
    useSession.setState({ session: { accessToken: 't', refreshToken: '', expiresAt: 0, user: { id: 'u1', isGuest: false } }, me: null })
    get.mockImplementation(async (p: string) =>
      p === '/api/farms/me/nudge' ? { nudge: nudgeFixture } : { ...meFixture, currentGameId: null },
    )
    show()
    expect(await screen.findByText('today page')).toBeInTheDocument()
  })

  it('does not wait for a nudge request that failed', async () => {
    useSession.setState({ session: { accessToken: 't', refreshToken: '', expiresAt: 0, user: { id: 'u1', isGuest: false } }, me: null })
    get.mockImplementation(async (p: string) => {
      if (p === '/api/farms/me/nudge') throw new Error('offline')
      return { ...meFixture, currentGameId: null }
    })
    show()
    expect(await screen.findByText('new game page')).toBeInTheDocument()
  })
})
