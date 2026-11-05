import { levelFromXp, rankKeyForLevel, sofiaDate, sofiaMidnight } from '@bc/game-core'
import type { BoardDto, BoardKind, BoardPeriod, BoardRowDto } from '@bc/protocol'
import { isOnline, isPlaying } from '../admin/online'
import { AppError } from '../http/errors'
import type { AuthUser } from '../ports/auth'
import type { Clock } from '../ports/clock'
import { LEADERBOARD_LIMIT, type BoardEntry, type BoardRepoQuery, type Repo } from '../ports/repo'
import { hasGoldFrame } from '../weekly/model'
import { previousDate } from './streak'
import { sofiaWeekStart } from './time'

/** Rows shown, as on „Точки“; `me` is still found among everything the repo ranked. */
const BOARD_ROWS = 50
/** 'YYYY-MM-' of a Sofia date. */
const MONTH_PREFIX = 8

export interface BoardsDeps {
  readonly repo: Repo
  readonly clock: Clock
}

/** Start of the „Игри“ period in Sofia time (Unix ms). */
export function periodStart(period: BoardPeriod, now: number): number {
  if (period === 'week') return sofiaWeekStart(now)
  const today = sofiaDate(new Date(now))
  return sofiaMidnight(period === 'month' ? `${today.slice(0, MONTH_PREFIX)}01` : today)
}

/** Duel ratings are shown rounded (as game-core `displayRating`); every other value is a count. */
const shown = (value: number): number => Math.round(value)

function toRow(kind: BoardKind, e: BoardEntry, rank: number, me: string, now: number): BoardRowDto {
  const level = levelFromXp(e.xp)
  const online = isOnline(e.lastSeenAt, now)
  const you = e.userId === me
  const extra =
    kind === 'friends' && you
      ? {}
      : { best: e.best, wins: e.wins, losses: e.losses, draws: e.draws }
  return {
    rank,
    username: e.username,
    you,
    level,
    rankKey: rankKeyForLevel(level),
    avatarSpecies: e.avatarSpecies,
    goldFrame: hasGoldFrame(e.goldFrameUntil, now),
    online,
    // „Предизвикай“ needs the id: only for an online player who is not me.
    ...(online && !you ? { id: e.userId } : {}),
    ...(online && !you && isPlaying(e.lastSeenAt, e.lastActivity, now) ? { playing: true } : {}),
    value: shown(e.value),
    ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined)),
  }
}

/** `GET /api/leaderboard/:kind`: members only, guests never ranked. */
export async function kindBoard(
  deps: BoardsDeps,
  user: AuthUser,
  kind: BoardKind,
  period: BoardPeriod,
): Promise<BoardDto> {
  if (user.isGuest) throw new AppError('ERR_GUEST', 403)
  const now = deps.clock.now()
  const query: BoardRepoQuery = {
    kind,
    viewer: user.id,
    sinceMs: periodStart(period, now),
    liveFrom: previousDate(sofiaDate(new Date(now))),
  }
  const entries = await deps.repo.boards.top(query)
  const rows = entries.map((e, i) => toRow(kind, e, i + 1, user.id, now))
  const mine = rows.find((r) => r.you)
  const place = mine
    ? { rank: mine.rank, value: mine.value }
    : entries.length >= LEADERBOARD_LIMIT
      ? await deps.repo.boards.placeOf(query, user.id)
      : null
  return {
    kind,
    rows: rows.slice(0, BOARD_ROWS),
    me: place && { rank: place.rank, value: shown(place.value) },
  }
}
