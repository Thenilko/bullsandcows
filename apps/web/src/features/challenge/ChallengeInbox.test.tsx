import type { ChallengeDto } from '@bc/protocol'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { sfx } from '../../lib/sound'
import { renderWithI18n } from '../../test/render'
import { useSession } from '../auth/session'

const get = vi.fn()
const post = vi.fn()
vi.mock('../auth/client', () => ({
  api: { get: (p: string) => get(p), patch: vi.fn(), post: (p: string, b?: unknown) => post(p, b) },
}))

const { ChallengeInbox } = await import('./ChallengeInbox')

const challenge = (over: Partial<ChallengeDto> = {}): ChallengeDto => ({
  id: 'c1',
  from: { username: 'Ани', level: 3, avatarSpecies: 'cow' },
  settings: { format: 'race', len: 4, zero: false },
  expiresAt: Date.now() + 5 * 60_000,
  ...over,
})

function fakeRouter(pathname = '/board') {
  const listeners = new Set<() => void>()
  const router = {
    state: { location: { pathname } },
    subscribe: (fn: () => void) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    navigate: vi.fn(),
    go(path: string) {
      router.state = { location: { pathname: path } }
      listeners.forEach((fn) => fn())
    },
  }
  return router
}

const signIn = (isGuest = false) =>
  useSession.setState({
    session: { accessToken: 't', refreshToken: 'r', expiresAt: 1, user: { id: 'me', isGuest } },
    me: null,
  })

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  signIn()
})

afterEach(() => {
  useSession.setState({ session: null, me: null })
  vi.restoreAllMocks()
})

describe('ChallengeInbox', () => {
  it('shows the newest challenge with its settings and countdown, and rings once', async () => {
    const play = vi.spyOn(sfx, 'play').mockImplementation(() => undefined)
    get.mockResolvedValue({ challenges: [challenge()] })
    renderWithI18n(<ChallengeInbox router={fakeRouter()} />)
    const card = await screen.findByRole('alertdialog', { name: 'Предизвикателство за дуел' })
    expect(card).toHaveTextContent('Ани те предизвика на дуел')
    expect(card).toHaveTextContent('Надпревара')
    expect(card).toHaveTextContent('4 цифри')
    expect(card).toHaveTextContent('без 0')
    expect(card).toHaveTextContent(/Остават 0[45]:\d\d/)
    expect(get).toHaveBeenCalledWith('/api/challenges/incoming')
    expect(play).toHaveBeenCalledWith('bell')
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('accept joins the room and opens it', async () => {
    get.mockResolvedValue({ challenges: [challenge()] })
    post.mockResolvedValue({ roomId: 'room-1', token: 'tok 1' })
    const router = fakeRouter()
    renderWithI18n(<ChallengeInbox router={router} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Приеми' }))
    await waitFor(() => expect(router.navigate).toHaveBeenCalledWith('/duel/room-1?token=tok%201'))
    expect(post).toHaveBeenCalledWith('/api/challenges/c1/accept', undefined)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('decline answers the server and hides the card', async () => {
    get.mockResolvedValue({ challenges: [challenge()] })
    post.mockResolvedValue({ status: 'declined' })
    renderWithI18n(<ChallengeInbox router={fakeRouter()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Откажи' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(post).toHaveBeenCalledWith('/api/challenges/c1/decline', undefined)
  })

  it('says why when the challenge is gone by the time it is accepted', async () => {
    get.mockResolvedValue({ challenges: [challenge()] })
    post.mockRejectedValue(new ApiError('ERR_INVITE_EXPIRED', 410))
    renderWithI18n(<ChallengeInbox router={fakeRouter()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Приеми' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('stays quiet for guests and during a game', async () => {
    get.mockResolvedValue({ challenges: [challenge()] })
    signIn(true)
    const { unmount } = renderWithI18n(<ChallengeInbox router={fakeRouter()} />)
    await act(async () => undefined)
    expect(get).not.toHaveBeenCalled()
    unmount()
    signIn()
    const router = fakeRouter('/play/g1')
    renderWithI18n(<ChallengeInbox router={router} />)
    await act(async () => undefined)
    expect(get).not.toHaveBeenCalled()
    act(() => router.go('/board'))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })

  it('hides an expired challenge', async () => {
    get.mockResolvedValue({ challenges: [challenge({ expiresAt: Date.now() - 1 })] })
    renderWithI18n(<ChallengeInbox router={fakeRouter()} />)
    await waitFor(() => expect(get).toHaveBeenCalled())
    await act(async () => undefined)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
