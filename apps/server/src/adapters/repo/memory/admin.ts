import { sofiaDate } from '@bc/game-core'
import type {
  AdminDay,
  AdminGameRow,
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
  const withPlayers = (g: GameRow): AdminGameRow | null => {
    const player = store.profiles.get(g.userId)
    if (!player) return null
    const d = [...store.duels.values()].find((x) => x.gameA === g.id || x.gameB === g.id)
    const isA = d?.gameA === g.id
    const opponentId = d ? (isA ? d.playerB : d.playerA) : null
    const opponent = opponentId ? store.profiles.get(opponentId) : undefined
    return {
      ...g,
      username: player.username,
      duel: d
        ? {
            id: d.id,
            format: d.format,
            opponentKind: d.opponentKind,
            botLevel: d.botLevel,
            outcome: d.outcome,
            isRematch: d.isRematch,
            opponent: opponent ? { id: opponent.id, username: opponent.username } : null,
            opponentGameId: isA ? d.gameB : d.gameA,
          }
        : null,
    }
  }

  return {
    games: async ({ limit, offset, userId }) =>
      [...store.games.values()]
        .filter((g) => userId === null || g.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1))
        .map(withPlayers)
        .filter((g): g is AdminGameRow => g !== null)
        .slice(offset, offset + limit),
    game: async (id) => {
      const g = store.games.get(id)
      return g ? withPlayers(g) : null
    },
    userCount: async () => store.profiles.size,
    users: async ({ limit, offset }) =>
      [...store.profiles.values()]
        .map((p): AdminUserRow => {
          const own = [...store.games.values()].filter((g) => g.userId === p.id)
          const lastGameAt = own.reduce<number | null>((max, g) => Math.max(max ?? 0, g.createdAt), null)
          const lastSeenAt = store.presence.get(p.id)?.at ?? null
          return {
            id: p.id,
            username: p.username,
            email: p.email,
            isGuest: p.isGuest,
            xp: p.xp,
            games: own.length,
            createdAt: p.createdAt,
            lastGameAt,
            lastSeenAt,
            activeAt: Math.max(p.createdAt, lastGameAt ?? 0, lastSeenAt ?? 0),
          }
        })
        .sort((a, b) => b.activeAt - a.activeAt || (a.id < b.id ? -1 : 1))
        .slice(offset, offset + limit),
    online: async ({ since, gameSince, limit }) =>
      [...store.presence.entries()]
        .filter(([, seen]) => seen.at >= since)
        .sort(([, a], [, b]) => b.at - a.at)
        .slice(0, limit)
        .flatMap(([id, seen]) => {
          const p = store.profiles.get(id)
          if (!p) return []
          const open = [...store.games.values()]
            .filter((g) => g.userId === id && g.finishedAt === null && g.createdAt >= gameSince)
            .sort((a, b) => b.createdAt - a.createdAt)[0]
          return [
            {
              id,
              username: p.username,
              isGuest: p.isGuest,
              xp: p.xp,
              activity: seen.activity,
              lastSeenAt: seen.at,
              game: open ? withPlayers(open) : null,
            },
          ]
        }),
    overview: async ({ now, days }) => {
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
      }
    },
  }
}
