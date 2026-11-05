import type { BoardDto, BoardKind, BoardRowDto } from '@bc/protocol'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { boardFixture } from '../test/fixtures'
import { renderRoute } from '../test/renderRoute'

const get = vi.fn()
const post = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: { get: (p: string) => get(p), patch: vi.fn(), post: (p: string, b?: unknown) => post(p, b) },
}))

const { Leaderboard } = await import('./Leaderboard')

function Probe() {
  const { search } = useLocation()
  return <output data-testid="search">{search}</output>
}

function show(at = '/board') {
  return renderRoute(
    <>
      <Leaderboard />
      <Probe />
    </>,
    { path: '/board', at },
  )
}

const row = (rank: number, username: string, value: number, extra: Partial<BoardRowDto> = {}) =>
  ({
    rank,
    username,
    value,
    you: false,
    level: 5,
    rankKey: 'shepherd',
    avatarSpecies: 'cow',
    online: false,
    ...extra,
  }) satisfies BoardRowDto

const boardOf = (kind: BoardKind, rows: BoardRowDto[], me: BoardDto['me'] = null): BoardDto => ({
  kind,
  rows,
  me,
})

/** Answers by path: „Точки“ gets the old fixture, every kind its own board. */
function serve(boards: Partial<Record<BoardKind, BoardDto>>) {
  get.mockImplementation(async (path: string) => {
    const kind = /^\/api\/leaderboard\/(\w+)/.exec(path)?.[1] as BoardKind | undefined
    if (!kind) return boardFixture
    return boards[kind] ?? boardOf(kind, [])
  })
}

const chips = () => within(screen.getByTestId('board-kinds'))

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  sessionStorage.clear()
})

describe('Leaderboard kinds', () => {
  it('shows the chips with „Точки“ first and chosen, and keeps the choice in ?kind=', async () => {
    serve({ duels: boardOf('duels', [row(1, 'Ани', 1612, { wins: 5, losses: 2 })]) })
    show()
    await screen.findByText('Боби')
    const labels = chips()
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(labels).toEqual(['Точки', 'Дуели', 'Серии', 'Пастири', 'Игри', 'Приятели'])
    expect(chips().getByRole('button', { name: 'Точки' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(chips().getByRole('button', { name: 'Дуели' }))
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?kind=duels'))
    expect(await screen.findByText('Дуели · рейтинг')).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith('/api/leaderboard/duels')
    fireEvent.click(chips().getByRole('button', { name: 'Точки' }))
    await waitFor(() => expect(screen.getByTestId('search')).toBeEmptyDOMElement())
    expect(await screen.findByText('Боби')).toBeInTheDocument()
  })

  it('opens the board named in the URL; an unknown kind is „Точки“', async () => {
    serve({})
    show('/board?kind=nope')
    await screen.findByText('Боби')
    expect(chips().getByRole('button', { name: 'Точки' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('Дуели: rating on the podium and W–L', async () => {
    serve({
      duels: boardOf(
        'duels',
        [
          row(1, 'Ани', 1612, { wins: 5, losses: 2 }),
          row(2, 'Мира', 1500, { you: true, wins: 1, losses: 1 }),
        ],
        { rank: 2, value: 1500 },
      ),
    })
    show('/board?kind=duels')
    expect(await screen.findByText('1612')).toBeInTheDocument()
    expect(screen.getByText('Ти си №2 · 1500')).toBeInTheDocument()
    // No digits or zero filters here.
    expect(screen.queryByRole('radiogroup', { name: 'Цифри' })).toBeNull()
  })

  it('Серии: the live streak and the best one', async () => {
    const rows = [1, 2, 3, 4].map((i) => row(i, `P${i}`, 10 - i, { best: 12 }))
    serve({ streaks: boardOf('streaks', rows) })
    const { container } = show('/board?kind=streaks')
    expect(await screen.findByText('9 дни')).toBeInTheDocument()
    const fourth = container.querySelector('.lbrow')
    expect(fourth).toHaveTextContent('P4')
    expect(fourth).toHaveTextContent('6 дни')
    expect(fourth).toHaveTextContent('рекорд 12')
  })

  it('Пастири: xp with the level and title', async () => {
    const rows = [1, 2, 3, 4].map((i) => row(i, `P${i}`, 5000 - i))
    serve({ herders: boardOf('herders', rows) })
    const { container } = show('/board?kind=herders')
    await screen.findByText('Овчар · ниво 5')
    expect(container.querySelector('.lbrow')).toHaveTextContent('Овчар · ниво 5')
    expect(container.querySelector('.lbrow')).toHaveTextContent('4996 т.')
  })

  it('Игри: only the day/week/month filter, sent as the period', async () => {
    serve({ games: boardOf('games', [row(1, 'Ани', 7)]) })
    show('/board?kind=games')
    expect(await screen.findByText('7 игри')).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith('/api/leaderboard/games?period=today')
    expect(screen.queryByRole('radio', { name: 'Всички' })).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Месец' }))
    await waitFor(() => expect(get).toHaveBeenLastCalledWith('/api/leaderboard/games?period=month'))
  })

  it('Приятели: head-to-head per friend; alone, a way to a duel', async () => {
    const rows = [
      row(1, 'Ани', 900),
      row(2, 'Боби', 800),
      row(3, 'Цвети', 700),
      row(4, 'Ники', 600, { wins: 3, losses: 1, draws: 2 }),
      row(5, 'Мира', 100, { you: true }),
    ]
    serve({ friends: boardOf('friends', rows, { rank: 5, value: 100 }) })
    show('/board?kind=friends')
    expect(
      await screen.findByLabelText('Ти срещу Ники: 3 победи, 1 загуби, 2 равни'),
    ).toHaveTextContent('3–1–2')
  })

  it('Приятели with nobody else: the empty state leads to /duel/new', async () => {
    serve({
      friends: boardOf('friends', [row(1, 'Мира', 0, { you: true })], { rank: 1, value: 0 }),
    })
    show('/board?kind=friends')
    expect(await screen.findByText('Изиграй дуел с някого и ще се появи тук')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Изиграй дуел' }))
    expect(await screen.findByText('elsewhere')).toBeInTheDocument()
  })

  it('„Предизвикай“ works on the other boards', async () => {
    const online = row(1, 'Ани', 1612, { online: true, id: 'u-ani', wins: 1, losses: 0 })
    serve({ duels: boardOf('duels', [online]) })
    show('/board?kind=duels')
    fireEvent.click(await screen.findByRole('button', { name: /Ани/ }))
    expect(await screen.findByTestId('challenge-confirm')).toBeInTheDocument()
  })
})
