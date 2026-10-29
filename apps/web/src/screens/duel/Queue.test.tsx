import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueueApi } from '../../features/duel/useQueue'
import { renderWithI18n } from '../../test/render'

const queue: QueueApi = { elapsedMs: 0, suggestInvite: false, queued: null, matched: null, error: null, leave: vi.fn() }
vi.mock('../../features/duel/useQueue', () => ({ useQueue: () => queue }))
const createInvite = vi.fn()
vi.mock('../../features/duel/api', async (orig) => ({
  ...(await orig<typeof import('../../features/duel/api')>()),
  duelApi: { createInvite: (...a: unknown[]) => createInvite(...a) },
}))

const { Queue } = await import('./Queue')

function Where() {
  const loc = useLocation()
  return <p data-testid="where">{loc.pathname + loc.search}</p>
}

function show() {
  return renderWithI18n(
    <MemoryRouter initialEntries={['/duel/queue?len=4&zero=0&format=race']}>
      <Routes>
        <Route path="/duel/queue" element={<Queue />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(queue, { elapsedMs: 0, suggestInvite: false, queued: null, matched: null, error: null })
})

describe('Queue', () => {
  it('shows the search state with the elapsed clock and a widening window', () => {
    queue.elapsedMs = 12_000
    show()
    expect(screen.getByRole('heading', { name: /Търсим противник/ })).toBeInTheDocument()
    expect(screen.getByText('00:12')).toBeInTheDocument()
    expect(screen.getByTestId('range-bar')).toHaveStyle({ width: `${(225 / 525) * 100}%` })
  })

  it('says how many players are in the queue once the server tells', () => {
    queue.queued = 3
    show()
    expect(screen.getByText('В опашката сега: 3 играчи')).toBeInTheDocument()
  })

  it('tells guests quick match is for registered players and offers a profile CTA', () => {
    queue.error = 'guest'
    show()
    expect(screen.getByText('Това е за регистрирани пастири — направи си профил')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Направи си профил' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/login')
  })

  it('navigates to the room with the seat token when matched', () => {
    queue.matched = { roomId: 'room 9', token: 'tok/9' }
    show()
    expect(screen.getByTestId('where')).toHaveTextContent('/duel/room%209?token=tok%2F9')
  })

  it('offers an invite after the suggestion arrives and creates one', async () => {
    queue.suggestInvite = true
    queue.elapsedMs = 21_000
    createInvite.mockResolvedValue({ code: 'AB2CD', url: 'https://x/d/AB2CD', roomId: 'r1', token: 't1' })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Покани приятел' }))
    expect(createInvite).toHaveBeenCalledWith({ len: 4, zero: false, format: 'race' })
    expect(await screen.findByTestId('where')).toHaveTextContent('/duel/invite/AB2CD')
    expect(queue.leave).toHaveBeenCalled()
  })

  it('leaves the queue and returns to setup on cancel', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Откажи търсенето' }))
    expect(queue.leave).toHaveBeenCalled()
    expect(screen.getByTestId('where')).toHaveTextContent('/duel/new')
  })
})
