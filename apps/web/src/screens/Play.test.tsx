import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { GameViewDto, MeDto } from '@bc/protocol'
import { act, fireEvent, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { codes, filterCandidates, isConsistent } from '@bc/game-core'
import { ApiError } from '../lib/api'
import { renderWithI18n } from '../test/render'

const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn() }
vi.mock('../features/auth/client', () => ({ api }))
vi.mock('../hooks/useIsDesktop', () => ({ useIsDesktop: () => true }))

const { Play } = await import('./Play')
const { useSession } = await import('../features/auth/session')
const { useSolo } = await import('../features/solo/store')

const base: GameViewDto = {
  id: 'g1',
  kind: 'free',
  len: 4,
  zero: false,
  practice: false,
  total: 3024,
  startedAt: null,
  finishedAt: null,
  won: null,
  score: null,
  attempts: 0,
  guesses: [],
}
/** Guess history with the same left/consistent values the server would send. */
function history(entries: readonly (readonly [string, number, number])[]): GameViewDto['guesses'] {
  let cands: readonly string[] = codes(4, false)
  return entries.map(([guess, bulls, cows]) => {
    const consistent = isConsistent(cands, guess)
    cands = filterCandidates(cands, guess, { bulls, cows })
    return { guess, bulls, cows, consistent, left: cands.length }
  })
}
const started: GameViewDto = { ...base, startedAt: Date.now() - 5000 }
const ME = { profile: { vibrate: false, sound: false, defaultLen: 4 }, currentGameId: null } as unknown as MeDto

function serve(game: GameViewDto) {
  api.get.mockImplementation(async (path: string) => {
    if (path === '/api/games/g1') return game
    if (path.startsWith('/api/stats/distribution')) return { histogram: [0, 0, 10, 10], sample: 20, fallback: true }
    throw new Error(`unexpected GET ${path}`)
  })
}

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderWithI18n(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/play/g1']}>
        <Routes>
          <Route path="/play/:gameId" element={<Play />} />
          <Route path="/result/:id" element={<p>result page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const key = (k: string) => fireEvent.keyDown(window, { key: k })
const type = (digits: string) => [...digits].forEach(key)

beforeEach(() => {
  vi.clearAllMocks()
  useSolo.setState({ ui: {} })
  useSession.setState({ session: null, me: ME })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('Play before the start', () => {
  it('ignores digits, and Enter runs the countdown then POSTs start after 2100 ms', async () => {
    serve(base)
    api.post.mockResolvedValue({ startedAt: 123456 })
    show()
    await screen.findByRole('button', { name: 'Старт' })
    vi.useFakeTimers()

    type('5')
    expect(screen.queryByLabelText('Цифра 5')).toBeDisabled()

    key('Enter')
    expect(screen.getByText('3', { selector: 'span.boing' })).toBeInTheDocument()
    await act(async () => void (await vi.advanceTimersByTimeAsync(2099)))
    expect(api.post).not.toHaveBeenCalled()
    await act(async () => void (await vi.advanceTimersByTimeAsync(1)))
    expect(api.post).toHaveBeenCalledWith('/api/games/g1/start')
    expect(screen.queryByRole('button', { name: 'Старт' })).not.toBeInTheDocument()
  })

  it('goes back to the Start gate with an error when POST start fails, and can retry', async () => {
    serve(base)
    api.post.mockRejectedValueOnce(new ApiError('ERR_INTERNAL', 500)).mockResolvedValue({ startedAt: 99 })
    show()
    await screen.findByRole('button', { name: 'Старт' })
    vi.useFakeTimers()
    key('Enter')
    await act(async () => void (await vi.advanceTimersByTimeAsync(2100)))
    expect(screen.getByRole('button', { name: 'Старт' })).toBeInTheDocument()
    expect(screen.getByText('Нещо се обърка. Опитай пак.')).toBeInTheDocument()
    expect(screen.getByLabelText('Цифра 1')).toBeDisabled()

    key('Enter')
    await act(async () => void (await vi.advanceTimersByTimeAsync(2100)))
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('button', { name: 'Старт' })).not.toBeInTheDocument()
  })

  it('renders the HUD in the scene slot with fog count and clock', async () => {
    serve(started)
    const { container } = show()
    await screen.findByLabelText('Цифра 1')
    const hud = Array.from(container.querySelectorAll('.ps-hud')).map((e) => e.textContent?.trim())
    expect(hud[0]).toMatch(/^Мъгла · .*възможни числа$/)
    expect(hud[1]).toMatch(/^\d\d:\d\d · опит 1$/)
  })

  it('redirects to the result when the game is already finished', async () => {
    serve({ ...base, startedAt: 1, finishedAt: 2, won: true })
    show()
    expect(await screen.findByText('result page')).toBeInTheDocument()
  })
})

describe('Play after the start', () => {
  it('submits 1234 and navigates to the result 1800 ms after a solved verdict', async () => {
    serve(started)
    api.post.mockResolvedValue({ bulls: 4, cows: 0, consistent: true, left: 1, solved: true, score: 900 })
    show()
    await screen.findByLabelText('Цифра 1')
    vi.useFakeTimers()

    type('1234')
    key('Enter')
    await act(async () => void (await vi.advanceTimersByTimeAsync(0)))
    expect(api.post).toHaveBeenCalledWith('/api/games/g1/guesses', { guess: '1234', usedNotes: false })
    expect(screen.queryByText('result page')).not.toBeInTheDocument()
    await act(async () => void (await vi.advanceTimersByTimeAsync(1799)))
    expect(screen.queryByText('result page')).not.toBeInTheDocument()
    await act(async () => void (await vi.advanceTimersByTimeAsync(1)))
    expect(screen.getByText('result page')).toBeInTheDocument()
  })

  it('blocks a short guess locally without calling the server', async () => {
    serve(started)
    show()
    await screen.findByLabelText('Цифра 1')
    type('12')
    key('Enter')
    expect(await screen.findByText('Трябват 4 различни цифри')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('blocks a repeated guess locally', async () => {
    serve({ ...started, attempts: 1, guesses: history([['1234', 0, 1]]) })
    show()
    await screen.findByLabelText('Цифра 1')
    type('1234')
    key('Enter')
    expect(await screen.findByText('Вече пробва 1234')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('never lets 0 in when the game has no zero', async () => {
    serve(started)
    show()
    await screen.findByLabelText('Цифра 1')
    type('0')
    expect(screen.getByLabelText('Цифра 0')).toBeDisabled()
    key('Enter')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows the translated error and refetches the game on ERR_FINISHED', async () => {
    serve(started)
    api.post.mockRejectedValue(new ApiError('ERR_FINISHED', 409))
    show()
    await screen.findByLabelText('Цифра 1')
    type('1234')
    key('Enter')
    expect(await screen.findByText('Тази игра вече приключи.')).toBeInTheDocument()
    expect(api.get.mock.calls.filter(([p]) => p === '/api/games/g1')).toHaveLength(2)
  })

  it('shows the rate-limit message on 429', async () => {
    serve(started)
    api.post.mockRejectedValue(new ApiError('ERR_RATE_LIMIT', 429))
    show()
    await screen.findByLabelText('Цифра 1')
    type('1234')
    key('Enter')
    expect(await screen.findByText('Много бързаш — изчакай малко и опитай пак.')).toBeInTheDocument()
  })

  it('lists the history newest first with the wasted marker', async () => {
    serve({
      ...started,
      attempts: 2,
      guesses: history([
        ['1234', 0, 0],
        ['1567', 0, 0],
      ]),
    })
    show()
    const rows = await screen.findAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('1567')
    expect(rows[0]).toHaveTextContent('излишен')
    expect(rows[1]).toHaveTextContent('1234')
  })
})
