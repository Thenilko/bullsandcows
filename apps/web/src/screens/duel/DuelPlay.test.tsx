import { act, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FIXTURE_T0,
  fixtureMe,
  fixtureOpp,
  fixtureState,
  myGuess,
  oppGuess,
} from '../../dev/duelFixtures'
import { useCoach } from '../../features/coach/store'
import { useDuelStore } from '../../features/duel/store'
import { useNotesSheet } from '../../features/notebook/sheet'
import { useNotebookStore } from '../../features/notebook/store'
import { WIN_DELAY_MS } from '../../features/solo/feedback'
import { renderWithI18n } from '../../test/render'
import { DuelPlay } from './DuelPlay'

const send = vi.fn()

function show(state = fixtureState()) {
  useDuelStore.getState().apply({ t: 'state', state })
  return renderWithI18n(
    <MemoryRouter initialEntries={['/duel/r1']}>
      <Routes>
        <Route
          path="/duel/:roomId"
          element={
            <DuelPlay roomId="r1" state={useDuelStore.getState().state ?? state} send={send} />
          }
        />
        <Route path="/duel/:roomId/result" element={<p>result screen</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const digit = (d: string) => screen.getByRole('button', { name: `Цифра ${d}` })

beforeEach(() => {
  send.mockClear()
  useDuelStore.getState().reset()
  sessionStorage.clear()
  localStorage.clear()
  useNotebookStore.setState({ games: {} })
  useNotesSheet.setState({ open: false })
  useCoach.setState({ seen: new Set(['notes', 'board']) })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DuelPlay', () => {
  it('shows the opponent strip over the scene, outside the panel', () => {
    show()
    const strip = document.querySelector('.ostrip') as HTMLElement
    expect(strip).not.toBeNull()
    expect(strip.closest('main')).toBeNull()
    expect(screen.getByTestId('opp-progress')).toBeInTheDocument()
  })

  it('shows the solo pills over the scene (the title, the turn timer, the clock) and no PasDuel top row', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(FIXTURE_T0 + 20_000)
    show(fixtureState({ turnDeadline: FIXTURE_T0 + 45_000 }))
    const title = screen.getByText('Дуел · Класически')
    expect(title).toHaveClass('ps-hud')
    expect(title.closest('main')).toBeNull()
    expect(screen.getByRole('timer')).toHaveClass('ps-hud')
    expect(screen.getByRole('timer')).toHaveTextContent('00:25')
    expect(screen.getByText('00:20')).toHaveClass('ps-hud')
    expect(screen.queryByRole('button', { name: 'Към нова игра' })).toBeNull()
  })

  it('heads the panel like the solo game: „Опит N“, whose turn, the last verdict, the notebook and the sound', () => {
    show(fixtureState({ me: fixtureMe({ guesses: [myGuess('5678', 0, 1)] }) }))
    const panel = screen.getByRole('region', { name: 'Дуел · Класически' })
    expect(panel).toHaveTextContent('Опит 2твой ход')
    expect(panel).toHaveTextContent('Последно 5678: 0 бика, 1 крава')
    expect(within(panel).getByRole('button', { name: 'Тефтерче' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: /звука/ })).toBeInTheDocument()
  })

  it('states the rule before the first guess: the race note, or the digits in a classic duel', () => {
    const { unmount } = show(fixtureState({ format: 'race', turn: null }))
    expect(
      screen.getByText('Боби познава същото число. Печели първият, който го открие.'),
    ).toBeInTheDocument()
    unmount()
    show()
    expect(screen.getByText('Въведи 4 различни цифри от 1 до 9')).toBeInTheDocument()
  })

  it('hangs my attempts on the wooden board and, in a classic duel, the opponent against my number', () => {
    sessionStorage.setItem('bc.mySecret.r1', '4321')
    show(
      fixtureState({
        me: fixtureMe({ guesses: [myGuess('1234', 1, 2)] }),
        opp: fixtureOpp({ guesses: [oppGuess('9021', 0, 2)] }),
      }),
    )
    const board = screen.getByRole('region', { name: 'Твоите опити' })
    expect(board.closest('main')).toBeNull()
    expect(board).toHaveTextContent('1234')
    expect(within(board).getByRole('list', { name: 'Боби срещу твоето 4321' })).toHaveTextContent(
      '9021',
    )
  })

  it('keeps the race board to my attempts', () => {
    show(
      fixtureState({
        format: 'race',
        turn: null,
        me: fixtureMe({ guesses: [myGuess('1234', 1, 2)] }),
      }),
    )
    expect(screen.getByRole('region', { name: 'Твоите опити' })).toHaveTextContent('1234')
    expect(screen.queryByText(/срещу твоето/)).toBeNull()
  })

  it('opens the notebook sheet from the panel with my attempts and their candidate counts', () => {
    show(fixtureState({ me: { ...fixtureMe(), guesses: [myGuess('5678', 0, 0)], left: 120 } }))
    const opener = screen.getByRole('button', { name: 'Тефтерче' })
    expect(opener.closest('main')).not.toBeNull()
    fireEvent.click(opener)
    const sheet = screen.getByRole('dialog', { name: 'Тефтерче' })
    expect(sheet).toBeInTheDocument()
    expect(screen.getByText('Остават 120 възможни числа')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Опити' })).toHaveTextContent('5678')
    expect(screen.getByRole('list', { name: 'Опити' })).toHaveTextContent('120 вар.')
    fireEvent.click(screen.getByRole('button', { name: 'Затвори' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows notebook marks on the keypad; the notebook belongs to this match, not the room', () => {
    localStorage.setItem(
      `bc.notebook.r1:${FIXTURE_T0}`,
      JSON.stringify({ marks: { '7': 1 }, text: '' }),
    )
    localStorage.setItem('bc.notebook.r1', JSON.stringify({ marks: { '8': 1 }, text: '' }))
    show()
    expect(digit('7')).toHaveClass('nx')
    expect(digit('8')).not.toHaveClass('nx')
  })

  it('enables the keypad on my turn', () => {
    show()
    expect(digit('1')).toBeEnabled()
  })

  it('disables the keypad when it is the opponent turn', () => {
    show(fixtureState({ turn: 'b' }))
    expect(digit('1')).toBeDisabled()
    expect(screen.getByText(/Боби мисли/)).toBeInTheDocument()
  })

  it('disables the keypad when the match is not playing', () => {
    show(fixtureState({ phase: 'countdown' }))
    expect(digit('1')).toBeDisabled()
  })

  it('keeps the race keypad enabled regardless of turn', () => {
    show(fixtureState({ format: 'race', turn: null }))
    expect(digit('1')).toBeEnabled()
  })

  it('sends a complete guess and clears the input', () => {
    show()
    for (const d of ['1', '2', '3', '4']) fireEvent.click(digit(d))
    fireEvent.click(screen.getByRole('button', { name: 'Пусни стадото!' }))
    expect(send).toHaveBeenCalledWith({ t: 'guess', code: '1234', usedNotes: false })
    expect(useDuelStore.getState().cur).toBe('')
  })

  it('rejects a repeated guess locally with a translated message', () => {
    show(fixtureState({ me: fixtureMe({ guesses: [myGuess('1234', 1, 1)] }) }))
    for (const d of ['1', '2', '3', '4']) fireEvent.click(digit(d))
    fireEvent.click(screen.getByRole('button', { name: 'Пусни стадото!' }))
    expect(send).not.toHaveBeenCalled()
    expect(screen.getByText('Вече пробва това число.')).toBeInTheDocument()
  })

  it('shows the red timer after a warning event', () => {
    const deadline = Date.now() + 60_000
    show(fixtureState({ turnDeadline: deadline }))
    expect(screen.getByRole('timer')).not.toHaveAttribute('data-warning', 'true')
    act(() => useDuelStore.getState().apply({ t: 'warning', msLeft: 15_000 }))
    expect(screen.getByRole('timer')).toHaveAttribute('data-warning', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Остават 15 секунди за хода!')
  })

  it('says when a timed-out move passed instead of ending the game', () => {
    show(fixtureState({ turnDeadline: Date.now() + 60_000 }))
    act(() => useDuelStore.getState().apply({ t: 'warning', msLeft: 15_000 }))
    act(() => useDuelStore.getState().apply({ t: 'skipped', mine: true, strikesLeft: 2 }))
    expect(
      screen.getByText('Времето изтече — ходът мина. Още 2 пропуснати хода подред са загуба.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('timer')).not.toHaveAttribute('data-warning', 'true')
  })

  it('announces opponent moves with a toast', () => {
    show(fixtureState({ format: 'race', turn: null, opp: fixtureOpp({ left: 900 }) }))
    act(() => useDuelStore.getState().apply({ t: 'oppMoved', attempts: 3, left: 900 }))
    expect(screen.getByText('Боби направи опит №3')).toBeInTheDocument()
  })

  it('goes to the result as quickly as the solo game (WIN_DELAY_MS) after the match ends', () => {
    vi.useFakeTimers()
    show()
    act(() => {
      useDuelStore.getState().apply({
        t: 'ended',
        outcome: 'win',
        reason: 'solved',
        secrets: { mine: '1234', theirs: '4321' },
        rating: null,
        xp: 120,
      })
    })
    act(() => vi.advanceTimersByTime(WIN_DELAY_MS - 1))
    expect(screen.queryByText('result screen')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('result screen')).toBeInTheDocument()
  })

  it('gives up from the notebook, as in the solo game', () => {
    show()
    expect(screen.queryByRole('button', { name: 'Предавам се' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Тефтерче' }))
    fireEvent.click(screen.getByRole('button', { name: 'Предавам се' }))
    expect(send).toHaveBeenCalledWith({ t: 'giveUp' })
  })
})
