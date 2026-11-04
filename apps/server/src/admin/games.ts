import type {
  AdminGameDetailDto,
  AdminGameDto,
  AdminGameSideDto,
  AdminGamesDto,
} from '@bc/protocol'
import type { AdminGameRow, Repo } from '../ports/repo'

export const ADMIN_GAMES_PAGE = 50

export const toAdminGame = (g: AdminGameRow): AdminGameDto => ({
  id: g.id,
  kind: g.kind,
  len: g.len,
  zero: g.zero,
  practice: g.practice,
  secret: g.secret,
  attempts: g.attempts,
  won: g.won,
  score: g.score,
  suspicious: g.suspicious,
  usedNotes: g.usedNotes,
  createdAt: g.createdAt,
  finishedAt: g.finishedAt,
  player: { id: g.userId, username: g.username },
  duel: g.duel,
})

/** Every game, newest first, a page at a time; `userId` keeps one player's. */
export async function adminGames(
  repo: Repo,
  { offset, userId }: { offset: number; userId: string | null },
): Promise<AdminGamesDto> {
  // One extra row tells whether another page exists.
  const rows = await repo.admin.games({ limit: ADMIN_GAMES_PAGE + 1, offset, userId })
  return {
    games: rows.slice(0, ADMIN_GAMES_PAGE).map(toAdminGame),
    nextOffset: rows.length > ADMIN_GAMES_PAGE ? offset + ADMIN_GAMES_PAGE : null,
  }
}

async function sideOf(repo: Repo, game: AdminGameRow): Promise<AdminGameSideDto> {
  const guesses = await repo.games.guesses(game.id)
  return {
    game: toAdminGame(game),
    guesses: guesses.map(({ guess, bulls, cows, consistent, at }) => ({
      guess,
      bulls,
      cows,
      consistent,
      at,
    })),
  }
}

/** Voids an unfair daily or free game (practice, 0 points); null when there is no such game. */
export async function adminVoidGame(repo: Repo, id: string): Promise<AdminGameDto | null> {
  if (!(await repo.admin.voidGame(id))) return null
  const game = await repo.admin.game(id)
  return game ? toAdminGame(game) : null
}

/** One game with every guess; a duel also brings the opponent's game. Null when there is no such game. */
export async function adminGame(repo: Repo, id: string): Promise<AdminGameDetailDto | null> {
  const game = await repo.admin.game(id)
  if (!game) return null
  const otherId = game.duel?.opponentGameId ?? null
  const other = otherId ? await repo.admin.game(otherId) : null
  return { side: await sideOf(repo, game), opponent: other ? await sideOf(repo, other) : null }
}
