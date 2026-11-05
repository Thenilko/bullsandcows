import type { GuessEntryDto } from '@bc/protocol'
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCoach } from '../../features/coach/store'
import { useNotesSheet } from '../../features/notebook/sheet'
import { renderWithI18n } from '../../test/render'
import { GuessBoard, OppBoard } from './GuessBoard'

const guess = (g: string, bulls: number, cows: number, consistent = true): GuessEntryDto =>
  ({ guess: g, bulls, cows, consistent, left: 10, at: 0 }) as GuessEntryDto

beforeEach(() => {
  useNotesSheet.setState({ open: false })
  useCoach.setState({ seen: new Set(['notes', 'board']) })
})

describe('GuessBoard', () => {
  it('stays hidden before the first guess', () => {
    renderWithI18n(<GuessBoard guesses={[]} started />)
    expect(screen.queryByTestId('guess-board')).toBeNull()
  })

  it('lists every guess, newest first, with bulls and cows', () => {
    renderWithI18n(
      <GuessBoard guesses={[guess('1234', 1, 1), guess('5678', 0, 2, false)]} started />,
    )
    const rows = within(screen.getByRole('region', { name: 'Твоите опити' })).getAllByRole(
      'listitem',
    )
    expect(rows.map((r) => r.textContent)).toEqual(['2567802!', '1123411'])
    expect(within(rows[0]!).getByLabelText('0 бика')).toBeInTheDocument()
    expect(within(rows[0]!).getByLabelText('2 крави')).toBeInTheDocument()
  })

  it('opens the notebook', () => {
    renderWithI18n(<GuessBoard guesses={[guess('1234', 1, 1)]} started />)
    fireEvent.click(screen.getByRole('button', { name: 'Отвори тефтерчето' }))
    expect(useNotesSheet.getState().open).toBe(true)
  })

  it('explains bulls and cows once, after the first guess', async () => {
    useCoach.setState({ seen: new Set(['notes']) })
    renderWithI18n(<GuessBoard guesses={[guess('1234', 1, 1)]} started />)
    const tip = await screen.findByRole('note')
    expect(tip).toHaveTextContent('Бик: цифрата е на точното място')
    fireEvent.click(within(tip).getByRole('button', { name: 'Разбрах' }))
    expect(screen.queryByRole('note')).toBeNull()
    expect(useCoach.getState().seen.has('board')).toBe(true)
  })

  it('adds a second list under mine (a classic duel), with its own caption', () => {
    renderWithI18n(
      <GuessBoard
        guesses={[guess('1234', 1, 1)]}
        started
        opp={{
          label: 'Боби срещу твоето 4321',
          guesses: [{ guess: '9021', bulls: 0, cows: 2 }],
          empty: 'още няма опити',
        }}
      />,
    )
    const board = screen.getByRole('region', { name: 'Твоите опити' })
    expect(
      within(board).getByRole('heading', { name: 'Боби срещу твоето 4321' }),
    ).toBeInTheDocument()
    const opp = within(board).getByRole('list', { name: 'Боби срещу твоето 4321' })
    expect(
      within(opp)
        .getAllByRole('listitem')
        .map((r) => r.textContent),
    ).toEqual(['1902102'])
  })

  it('shows the board when only the opponent has guessed, and the empty note for an empty list', () => {
    const { unmount } = renderWithI18n(
      <GuessBoard
        guesses={[]}
        started
        opp={{ label: 'Боби', guesses: [{ guess: '9021', bulls: 0, cows: 2 }], empty: '—' }}
      />,
    )
    expect(screen.getByTestId('guess-board')).toHaveTextContent('9021')
    unmount()
    renderWithI18n(
      <GuessBoard
        guesses={[guess('1234', 1, 1)]}
        started
        opp={{ label: 'Боби', guesses: [], empty: 'още няма опити' }}
      />,
    )
    expect(screen.getByText('още няма опити')).toBeInTheDocument()
  })
})

describe('OppBoard', () => {
  it('is the same plank with only the opponent list, without the notebook link', () => {
    renderWithI18n(
      <OppBoard
        section={{
          label: 'Боби срещу твоето 4321',
          guesses: [{ guess: '9021', bulls: 0, cows: 2 }],
          empty: '—',
        }}
      />,
    )
    const plank = screen.getByTestId('opp-board')
    expect(plank).toHaveTextContent('9021')
    expect(screen.queryByRole('button', { name: 'Отвори тефтерчето' })).toBeNull()
  })
})
