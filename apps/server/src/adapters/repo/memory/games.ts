import { sofiaDate } from '@bc/game-core'
import { AppError } from '../../../http/errors'
import type { Clock } from '../../../ports/clock'
import { duplicateError } from '../../../ports/errors'
import type {
  GameRow,
  GamesRepo,
  GuessRow,
  NewGame,
  PublicGameRow,
  WonAttemptsQuery,
} from '../../../ports/repo'
import { rankLeaderboard, rankOf } from './leaderboard'
import { copy, defined, publicGame, type MemoryStore } from './store'

function matchesWon(g: GameRow, q: WonAttemptsQuery): boolean {
  if (g.won !== true || g.practice || g.kind !== q.kind || g.len !== q.len || g.zero !== q.zero)
    return false
  if (q.date !== undefined && g.dailyDate !== q.date) return false
  if (q.sinceMs !== undefined && (g.finishedAt === null || g.finishedAt < q.sinceMs)) return false
  return true
}

const isCountedDaily = (g: Pick<GameRow, 'kind' | 'practice'>) => g.kind === 'daily' && !g.practice

/** Same rule as the partial unique index `games_daily_counted_idx`. */
const sameCountedDaily = (a: GameRow, b: NewGame) =>
  isCountedDaily(a) &&
  isCountedDaily(b) &&
  a.userId === b.userId &&
  a.dailyDate === b.dailyDate &&
  a.len === b.len &&
  a.zero === b.zero

export function memoryGames(store: MemoryStore, clock: Clock): GamesRepo {
  const save = (game: GameRow): PublicGameRow => {
    store.games.set(game.id, copy(game))
    return publicGame(game)
  }
  const all = (): GameRow[] => [...store.games.values()]

  return {
    create: async (input) => {
      const existing = input.id === undefined ? undefined : store.games.get(input.id)
      if (existing) return publicGame(existing)
      if (all().some((g) => sameCountedDaily(g, input))) throw duplicateError('daily game')
      return save({
        ...input,
        id: input.id ?? crypto.randomUUID(),
        startedAt: null,
        finishedAt: null,
        attempts: 0,
        wasted: 0,
        won: null,
        score: 0,
        suspicious: false,
        createdAt: clock.now(),
      })
    },
    get: async (id) => {
      const found = store.games.get(id)
      return found ? publicGame(found) : null
    },
    getWithSecret: async (id) => {
      const found = store.games.get(id)
      return found ? copy(found) : null
    },
    update: async (id, patch) => {
      const current = store.games.get(id)
      if (!current) throw new AppError('ERR_NOT_FOUND', 404)
      return save({ ...current, ...defined(patch) })
    },
    addGuess: async (input) => {
      const existing = store.guesses.get(input.gameId) ?? []
      if (existing.some((g) => g.guess === input.guess)) throw duplicateError('guess')
      const row: GuessRow = { ...input, id: store.nextGuessId }
      store.nextGuessId += 1
      store.guesses.set(input.gameId, [...existing, copy(row)])
      return copy(row)
    },
    guesses: async (gameId) => copy([...(store.guesses.get(gameId) ?? [])]),
    dailyOf: async (userId, date, len, zero) => {
      const found = all()
        .filter((g) => g.userId === userId && g.kind === 'daily' && !g.practice)
        .filter((g) => g.dailyDate === date && g.len === len && g.zero === zero)
        .sort((a, b) => a.createdAt - b.createdAt)[0]
      return found ? publicGame(found) : null
    },
    wonAttempts: async (q) =>
      all()
        .filter((g) => matchesWon(g, q))
        .map((g) => g.attempts),
    wonAttemptsByDate: async ({ len, zero, dates }) => {
      const byDate = new Map<string, number[]>()
      for (const g of all()) {
        if (g.dailyDate === null || !dates.includes(g.dailyDate)) continue
        if (!matchesWon(g, { kind: 'daily', len, zero })) continue
        byDate.set(g.dailyDate, [...(byDate.get(g.dailyDate) ?? []), g.attempts])
      }
      return Object.fromEntries(byDate)
    },
    leaderboard: async (q) => rankLeaderboard(store.games.values(), store.profiles, q),
    leaderboardRankOf: async (q, userId) => rankOf(store.games.values(), store.profiles, q, userId),
    recordDailyNumber: async (date, len, zero, idx) => {
      const key = `${date}|${len}|${zero ? 1 : 0}`
      if (!store.dailyNumbers.has(key)) store.dailyNumbers.set(key, idx)
    },
    history: async (userId, limit) =>
      all()
        .filter((g) => g.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map(publicGame),
    countFreeGamesOn: async (userId, date) =>
      all().filter(
        (g) =>
          g.userId === userId &&
          g.kind === 'free' &&
          !g.practice &&
          g.finishedAt !== null &&
          sofiaDate(new Date(g.finishedAt)) === date,
      ).length,
  }
}
