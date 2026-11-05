import type { LeaderboardRowDto } from '@bc/protocol'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { BoardRows } from './BoardRows'

const row = (over: Partial<LeaderboardRowDto>): LeaderboardRowDto => ({
  rank: 4,
  username: 'Ники',
  attempts: 6,
  score: 800,
  you: false,
  level: 3,
  rankKey: 'herdsman',
  avatarSpecies: 'bull',
  ...over,
})

const rows = [
  row({ rank: 4, username: 'Ники', online: true, id: 'u-niki' }),
  row({ rank: 5, username: 'Мира', online: true, you: true }),
  row({ rank: 6, username: 'Вили', online: false }),
]

describe('BoardRows challenge', () => {
  it('offers „Предизвикай“ only next to an online player who is not me', () => {
    renderWithI18n(<BoardRows rows={rows} onChallenge={vi.fn()} />)
    const buttons = screen.getAllByRole('button', { name: /^Предизвикай/ })
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName('Предизвикай Ники на дуел')
    expect(buttons[0]).toHaveTextContent('Предизвикай')
    expect(screen.getAllByRole('img', { name: 'На линия' })).toHaveLength(1)
  })

  it('hands the row to onChallenge', () => {
    const onChallenge = vi.fn()
    renderWithI18n(<BoardRows rows={rows} onChallenge={onChallenge} wide />)
    fireEvent.click(screen.getByRole('button', { name: 'Предизвикай Ники на дуел' }))
    expect(onChallenge).toHaveBeenCalledWith(rows[0])
  })

  it('shows only the dot without onChallenge (the gallery)', () => {
    renderWithI18n(<BoardRows rows={rows} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('img', { name: 'На линия' })).toBeInTheDocument()
  })

  it('marks a player in a game „играе“ and still offers „Предизвикай“', () => {
    const onChallenge = vi.fn()
    const busy = [row({ rank: 4, username: 'Ники', online: true, playing: true, id: 'u-niki' })]
    renderWithI18n(<BoardRows rows={busy} onChallenge={onChallenge} />)
    expect(screen.getByTitle('Ники играе в момента')).toHaveTextContent('играе')
    fireEvent.click(screen.getByRole('button', { name: 'Предизвикай Ники на дуел' }))
    expect(onChallenge).toHaveBeenCalledWith(busy[0])
  })

  it('does not say „играе“ for a player who is only online', () => {
    renderWithI18n(<BoardRows rows={rows} onChallenge={vi.fn()} />)
    expect(screen.queryByText('играе')).toBeNull()
  })
})

describe('ChallengeConfirm', () => {
  it('tells the sender a playing target will see the challenge during the game', async () => {
    const { ChallengeConfirm } = await import('./ChallengeConfirm')
    const props = {
      len: 4,
      zero: false,
      sending: false,
      error: null,
      onSend: vi.fn(),
      onClose: vi.fn(),
    }
    const { unmount } = renderWithI18n(
      <ChallengeConfirm row={row({ online: true, id: 'u-niki', playing: true })} {...props} />,
    )
    expect(screen.getByRole('note')).toHaveTextContent('Ники е в игра в момента')
    unmount()
    renderWithI18n(<ChallengeConfirm row={row({ online: true, id: 'u-niki' })} {...props} />)
    expect(screen.queryByRole('note')).toBeNull()
  })
})

describe('podium challenge', () => {
  it('puts the dot and „Предизвикай“ under an online player on the podium', async () => {
    const { BoardView } = await import('./BoardView')
    const onChallenge = vi.fn()
    const podium = [
      row({ rank: 1, username: 'Ани', online: true, id: 'u-ani' }),
      row({ rank: 2, username: 'Боби' }),
      row({ rank: 3, username: 'Цвети', online: true, you: true }),
    ]
    renderWithI18n(
      <BoardView
        status="ready"
        filters={{ period: 'today', len: 4, zero: false }}
        onFilters={vi.fn()}
        data={{ rows: podium, me: null }}
        onPlay={vi.fn()}
        onChallenge={onChallenge}
      />,
    )
    expect(screen.getAllByRole('button', { name: /^Предизвикай/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Предизвикай Ани на дуел' }))
    expect(onChallenge).toHaveBeenCalledWith(podium[0])
  })
})
