import type { Clock } from '../../../ports/clock'
import type {
  GameRow,
  WeeklyPlayEntry,
  WeeklyPlayRow,
  WeeklyRepo,
  WeeklyResultRow,
  WeekRow,
} from '../../../ports/repo'
import { copy, publicGame, type MemoryStore } from './store'

const resultKey = (weekId: string, userId: string) => `${weekId}|${userId}`

/**
 * The memory twin of the Postgres weekly challenge. No method awaits between its reads and writes, so in one
 * isolate each is as atomic as the transaction it mirrors (one play per day, one finalisation per week).
 */
export function memoryWeekly(store: MemoryStore, clock: Clock): WeeklyRepo {
  const plays = (): WeeklyPlayRow[] => [...store.weeklyPlays.values()]

  return {
    ensureWeek: async (input, now) => {
      const existing = store.weeks.get(input.weekId)
      if (existing) return copy(existing)
      const row: WeekRow = { ...input, createdAt: now, finalizedAt: null, participants: null }
      store.weeks.set(row.weekId, row)
      return copy(row)
    },
    week: async (weekId) => {
      const row = store.weeks.get(weekId)
      return row ? copy(row) : null
    },
    startPlay: async (game, play) => {
      if (plays().some((p) => p.userId === play.userId && p.day === play.day)) return null
      const now = clock.now()
      const row: GameRow = {
        ...game,
        startedAt: null,
        finishedAt: null,
        attempts: 0,
        wasted: 0,
        won: null,
        score: 0,
        suspicious: false,
        usedNotes: false,
        createdAt: now,
      }
      store.games.set(row.id, copy(row))
      store.weeklyPlays.set(game.id, {
        ...play,
        attempts: 0,
        secs: null,
        won: false,
        finishedAt: null,
        createdAt: now,
      })
      return publicGame(row)
    },
    playOn: async (userId, day) => {
      const found = plays().find((p) => p.userId === userId && p.day === day)
      return found ? copy(found) : null
    },
    playByGame: async (gameId) => {
      const found = store.weeklyPlays.get(gameId)
      return found ? copy(found) : null
    },
    openPlays: async (userId, weekId) =>
      plays()
        .filter((p) => p.userId === userId && p.weekId === weekId && p.finishedAt === null)
        .map(copy),
    finishPlay: async (gameId, finish) => {
      const current = store.weeklyPlays.get(gameId)
      if (current) store.weeklyPlays.set(gameId, { ...current, ...finish })
    },
    finishedPlays: async (weekId) =>
      plays().flatMap((p): WeeklyPlayEntry[] => {
        const profile = store.profiles.get(p.userId)
        if (p.weekId !== weekId || p.finishedAt === null || !profile || profile.isGuest) return []
        return [
          {
            ...copy(p),
            username: profile.username,
            xp: profile.xp,
            avatarSpecies: profile.avatarSpecies,
            goldFrameUntil: profile.goldFrameUntil,
          },
        ]
      }),
    dueWeeks: async (now) =>
      [...store.weeks.values()]
        .filter((w) => w.finalizedAt === null && w.endsAt <= now)
        .sort((a, b) => a.endsAt - b.endsAt)
        .map(copy),
    finalize: async ({ weekId, now, participants, results, goldFrameUntil }) => {
      const week = store.weeks.get(weekId)
      if (!week || week.finalizedAt !== null) return false
      for (const r of results) {
        store.weeklyResults.set(resultKey(weekId, r.userId), { ...r, seenAt: null, createdAt: now })
        const profile = store.profiles.get(r.userId)
        if (!profile) continue
        const frame = r.goldFrame
          ? Math.max(profile.goldFrameUntil ?? 0, goldFrameUntil)
          : profile.goldFrameUntil
        store.profiles.set(r.userId, { ...profile, xp: profile.xp + r.xp, goldFrameUntil: frame })
      }
      store.weeks.set(weekId, { ...week, finalizedAt: now, participants })
      return true
    },
    unseenResult: async (userId) => {
      const mine = [...store.weeklyResults.values()]
        .filter((r) => r.userId === userId && r.seenAt === null)
        .sort((a, b) => (a.weekId < b.weekId ? 1 : -1))
      return mine[0] ? copy(mine[0]) : null
    },
    markSeen: async (userId, now) => {
      for (const [key, r] of store.weeklyResults) {
        if (r.userId === userId && r.seenAt === null) {
          store.weeklyResults.set(key, { ...r, seenAt: now } satisfies WeeklyResultRow)
        }
      }
    },
    weeksWon: async (userId) =>
      [...store.weeklyResults.values()].filter((r) => r.userId === userId && r.won).length,
  }
}
