import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { GameViewDto, MeDto } from '@bc/protocol'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'

const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn() }
vi.mock('../auth/client', () => ({ api }))
vi.mock('../../lib/sound', () => ({ sfx: { play: vi.fn() } }))
const desktop = { value: true }
vi.mock('../../hooks/useIsDesktop', () => ({ useIsDesktop: () => desktop.value }))

const { Play } = await import('../../screens/Play')
const { useSession } = await import('../auth/session')
const { useSolo } = await import('../solo/store')
const { useNotebook, useNotebookStore } = await import('./store')

const game: GameViewDto = {
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
  attempts: 2,
  guesses: [
    { guess: '1234', bulls: 1, cows: 1, consistent: true, left: 300 },
    { guess: '5678', bulls: 0, cows: 0, consistent: false, left: 120 },
  ],
}
const ME = { profile: { vibrate: false, sound: false, defaultLen: 4 }, currentGameId: null } as unknown as MeDto

function show() {
  api.get.mockImplementation(async (path: string) => {
    if (path === '/api/games/g1') return game
    return { histogram: [0, 0, 10], sample: 20, fallback: true }
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderWithI18n(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/play/g1']}>
        <Routes>
          <Route path="/play/:gameId" element={<Play />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useNotebookStore.setState({ games: {} })
  useSolo.setState({ ui: {} })
  useSession.setState({ session: null, me: ME })
  desktop.value = true
})

describe('Notebook on desktop', () => {
  it('marks the keypad digit after a cycle and toggles through the notebook chip', async () => {
    show()
    const pad = await screen.findByLabelText('Цифра 7')
    expect(pad).not.toHaveClass('nx')
    act(() => useNotebookStore.getState().cycle('g1', '7'))
    expect(screen.getByLabelText('Цифра 7')).toHaveClass('nx')

    fireEvent.click(screen.getByRole('button', { name: 'Цифра 7: няма я' }))
    expect(screen.getByLabelText('Цифра 7')).toHaveClass('nok')
    expect(screen.getByRole('button', { name: 'Цифра 7: има я' })).toHaveClass('nok')
  })

  it('lists attempts with the remaining count and the wasted marker', async () => {
    show()
    const card = (await screen.findByRole('region', { name: 'Тефтерче' })) as HTMLElement
    const rows = within(card).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('5678')
    expect(rows[0]).toHaveTextContent('излишен')
    expect(rows[1]).toHaveTextContent('300 вар.')
  })

  it('binds the notes textarea to the text and clears only the marks', async () => {
    show()
    const area = await screen.findByLabelText('Мои бележки')
    fireEvent.change(area, { target: { value: '7 е в средата' } })
    expect(useNotebookStore.getState().games['g1']?.text).toBe('7 е в средата')
    act(() => useNotebookStore.getState().cycle('g1', '7'))
    fireEvent.click(screen.getByRole('button', { name: 'Изчисти цифрите' }))
    expect(screen.getByLabelText('Цифра 7')).not.toHaveClass('nx')
    expect(screen.getByLabelText('Мои бележки')).toHaveValue('7 е в средата')
  })

  it('does not type digits into the guess while the notes are focused', async () => {
    show()
    const area = await screen.findByLabelText('Мои бележки')
    fireEvent.keyDown(area, { key: '5' })
    expect(useSolo.getState().ui['g1']?.cur ?? '').toBe('')
  })
})

describe('Notebook sheet on mobile', () => {
  beforeEach(() => {
    desktop.value = false
  })

  it('opens from the header button and closes with Close, backdrop and Escape', async () => {
    show()
    const open = await screen.findByRole('button', { name: 'Тефтерче' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(open)
    expect(screen.getByRole('dialog', { name: 'Тефтерче' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Затвори' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(open)
    fireEvent.click(screen.getByTestId('notebook-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(open)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('moves focus into the dialog, traps Tab and restores focus to the opener on Escape', async () => {
    show()
    const open = await screen.findByRole('button', { name: 'Тефтерче' })
    fireEvent.click(open)
    const dialog = screen.getByRole('dialog', { name: 'Тефтерче' })
    expect(dialog).toHaveFocus()

    const close = screen.getByRole('button', { name: 'Затвори' })
    const buttons = within(dialog).getAllByRole('button')
    const last = buttons[buttons.length - 1]!
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(open).toHaveFocus()
  })

  it('shows a badge with the number of notes on the button', async () => {
    show()
    await screen.findByRole('button', { name: 'Тефтерче' })
    act(() => useNotebookStore.getState().cycle('g1', '2'))
    expect(screen.getByRole('button', { name: 'Тефтерче' })).toHaveTextContent('1')
  })
})

describe('useNotebook export', () => {
  it('is exported', () => {
    expect(typeof useNotebook).toBe('function')
  })
})
