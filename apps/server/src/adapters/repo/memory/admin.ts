import { sofiaDate } from '@bc/game-core'
import type {
  AdminDay,
  AdminKindRow,
  AdminRepo,
  AdminUserRow,
  GameKind,
  GameRow,
  OpponentKind,
} from '../../../ports/repo'
import type { MemoryStore } from './store'

const DAY_MS = 86_400_000
const KINDS: readonly GameKind[] = ['daily', 'free', 'duel_race', 'duel_classic', 'bot', 'weekly']

const dayOf = (ms: number): string => sofiaDate(new Date(ms))
const distinct = (games: readonly GameRow[]): number => new Set(games.map((g) => g.userId)).size

export function memoryAdmin(store: MemoryStore): AdminRepo {
  return {
    overview: async ({ now, days, recentLimit }) => {
      const profiles = [...store.profiles.values()]
      const games = [...store.games.values()]
      const since = (ms: number) => now - ms
      const playedSince = (ms: number) => distinct(games.filter((g) => g.createdAt >= since(ms)))

      const dayRows: AdminDay[] = days
        .map((date) => {
          const played = games.filter((g) => dayOf(g.createdAt) === date)
          return {
            date,
            newUsers: profiles.filter((p) => dayOf(p.createdAt) === date).length,
            activeUsers: distinct(played),
            games: played.length,
          }
        })
        .filter((d) => d.newUsers + d.games > 0)

      const kinds: AdminKindRow[] = KINDS.map((kind) => {
        const ofKind = games.filter((g) => g.kind === kind)
        const won = ofKind.filter((g) => g.won === true)
        return {
          kind,
          total: ofKind.length,
          finished: ofKind.filter((g) => g.finishedAt !== null).length,
          won: won.length,
          wonAttempts: won.reduce((sum, g) => sum + g.attempts, 0),
        }
      }).filter((k) => k.total > 0)

      const duels = [...store.duels.values()]
      const byOpponent = (kind: OpponentKind) => duels.filter((d) => d.opponentKind === kind).length

      const recentUsers: AdminUserRow[] = profiles
        .map((p) => {
          const own = games.filter((g) => g.userId === p.id)
          const last = own.reduce<number | null>((max, g) => Math.max(max ?? 0, g.createdAt), null)
          return {
            id: p.id,
            username: p.username,
            email: p.email,
            isGuest: p.isGuest,
            xp: p.xp,
            games: own.length,
            createdAt: p.createdAt,
            lastGameAt: last,
          }
        })
        .sort((a, b) => (b.lastGameAt ?? -1) - (a.lastGameAt ?? -1) || b.createdAt - a.createdAt)
        .slice(0, recentLimit)

      return {
        users: {
          total: profiles.length,
          guests: profiles.filter((p) => p.isGuest).length,
          new7d: profiles.filter((p) => p.createdAt >= since(7 * DAY_MS)).length,
          new30d: profiles.filter((p) => p.createdAt >= since(30 * DAY_MS)).length,
          active1d: playedSince(DAY_MS),
          active7d: playedSince(7 * DAY_MS),
          active30d: playedSince(30 * DAY_MS),
        },
        days: dayRows,
        kinds,
        social: {
          duels: duels.length,
          duels7d: duels.filter((d) => d.createdAt >= since(7 * DAY_MS)).length,
          duelsByOpponent: { quick: byOpponent('quick'), friend: byOpponent('friend'), bot: byOpponent('bot') },
          farms: store.farms.size,
          farmMembers: store.farmMembers.size,
          shares: store.shares.size,
          nudges: store.nudges.size,
          weeklyPlayers7d: distinct(games.filter((g) => g.kind === 'weekly' && g.createdAt >= since(7 * DAY_MS))),
        },
        recentUsers,
      }
    },
  }
}
