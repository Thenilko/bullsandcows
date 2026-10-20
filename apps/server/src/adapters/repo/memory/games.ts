import { AppError } from '../../../http/errors'
import type { Clock } from '../../../ports/clock'
import type { GameRow, GamesRepo, GuessRow, WonAttemptsQuery } from '../../../ports/repo'
import { rankLeaderboard } from './leaderboard'
import { copy, defined, type MemoryStore } from './store'

function matchesWon(g: GameRow, q: WonAttemptsQuery): boolean {
  if (g.won !== true || g.practice || g.kind !== q.kind || g.len !== q.len || g.zero !== q.zero)
    return false
  if (q.date !== undefined && g.dailyDate !== q.date) return false
  if (q.sinceMs !== undefined && (g.finishedAt === null || g.finishedAt < q.sinceMs)) return false
  return true
}

export function memoryGames(store: MemoryStore, clock: Clock): GamesRepo {
  const save = (game: GameRow): GameRow => {
    store.games.set(game.id, copy(game))
    return copy(game)
  }
  const all = (): GameRow[] => [...store.games.values()]

  return {
    create: async (input) =>
      save({
        ...input,
        id: crypto.randomUUID(),
        startedAt: null,
        finishedAt: null,
        attempts: 0,
        wasted: 0,
        won: null,
        score: 0,
        suspicious: false,
        createdAt: clock.now(),
      }),
    get: async (id) => {
      const found = store.games.get(id)
      return found ? copy(found) : null
    },
    update: async (id, patch) => {
      const current = store.games.get(id)
      if (!current) throw new AppError('ERR_NOT_FOUND', 404)
      return save({ ...current, ...defined(patch) })
    },
    addGuess: async (input) => {
      const row: GuessRow = { ...input, id: store.nextGuessId }
      store.nextGuessId += 1
      store.guesses.set(input.gameId, [...(store.guesses.get(input.gameId) ?? []), copy(row)])
      return copy(row)
    },
    guesses: async (gameId) => copy([...(store.guesses.get(gameId) ?? [])]),
    dailyOf: async (userId, date, len, zero) => {
      const found = all()
        .filter((g) => g.userId === userId && g.kind === 'daily' && !g.practice)
        .filter((g) => g.dailyDate === date && g.len === len && g.zero === zero)
        .sort((a, b) => a.createdAt - b.createdAt)[0]
      return found ? copy(found) : null
    },
    wonAttempts: async (q) =>
      all()
        .filter((g) => matchesWon(g, q))
        .map((g) => g.attempts),
    leaderboard: async (q) => rankLeaderboard(store.games.values(), store.profiles, q),
    history: async (userId, limit) =>
      copy(
        all()
          .filter((g) => g.userId === userId)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, limit),
      ),
  }
}
