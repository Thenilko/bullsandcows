import {
  LEADERBOARD_LIMIT,
  type BoardEntry,
  type BoardRepoQuery,
  type BoardsRepo,
  type DuelRow,
  type GameKind,
  type Profile,
} from '../../../ports/repo'
import type { MemoryStore } from './store'

type Record3 = Pick<BoardEntry, 'wins' | 'losses' | 'draws'>
type Extra = Omit<
  BoardEntry,
  'userId' | 'username' | 'xp' | 'avatarSpecies' | 'goldFrameUntil' | 'lastSeenAt' | 'lastActivity'
>

/** Kinds counted on „Игри“: solo daily/free and every duel (bots included); practice never counts. */
const COUNTED_KINDS: ReadonlySet<GameKind> = new Set([
  'daily',
  'free',
  'duel_race',
  'duel_classic',
  'bot',
])

const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** A finished duel between two human seats (not the bot). */
export const isHumanDuel = (d: DuelRow): d is DuelRow & { playerA: string; playerB: string } =>
  d.finishedAt !== null && d.opponentKind !== 'bot' && d.playerA !== null && d.playerB !== null

function recordOf(duels: readonly DuelRow[], me: string): Required<Record3> {
  return {
    wins: duels.filter((d) => d.winner === me).length,
    losses: duels.filter((d) => d.winner !== null && d.winner !== me).length,
    draws: duels.filter((d) => d.winner === null).length,
  }
}

interface Ranked {
  readonly profile: Profile
  readonly extra: Extra
  /** Negative when `a` ranks first. */
  readonly order: number[]
}

function duelEntries(store: MemoryStore, members: readonly Profile[]): Ranked[] {
  const human = [...store.duels.values()].filter(isHumanDuel)
  return members.flatMap((p) => {
    const mine = human.filter((d) => d.playerA === p.id || d.playerB === p.id)
    if (mine.length === 0) return []
    return [
      {
        profile: p,
        extra: { value: p.rating.rating, ...recordOf(mine, p.id) },
        order: [-p.rating.rating],
      },
    ]
  })
}

function streakEntries(members: readonly Profile[], liveFrom: string): Ranked[] {
  return members.flatMap((p) =>
    p.currentStreak > 0 && p.streakDate !== null && p.streakDate >= liveFrom
      ? [
          {
            profile: p,
            extra: { value: p.currentStreak, best: p.bestStreak },
            order: [-p.currentStreak, -p.bestStreak],
          },
        ]
      : [],
  )
}

function gameEntries(store: MemoryStore, members: readonly Profile[], sinceMs: number): Ranked[] {
  const counted = [...store.games.values()].filter(
    (g) =>
      COUNTED_KINDS.has(g.kind) && !g.practice && g.finishedAt !== null && g.finishedAt >= sinceMs,
  )
  return members.flatMap((p) => {
    const mine = counted.filter((g) => g.userId === p.id)
    if (mine.length === 0) return []
    const last = Math.max(...mine.map((g) => g.finishedAt ?? 0))
    return [{ profile: p, extra: { value: mine.length }, order: [-mine.length, last] }]
  })
}

function friendEntries(store: MemoryStore, members: readonly Profile[], viewer: string): Ranked[] {
  const mine = [...store.duels.values()]
    .filter(isHumanDuel)
    .filter((d) => d.playerA !== d.playerB && (d.playerA === viewer || d.playerB === viewer))
  const vs = (id: string) => mine.filter((d) => d.playerA === id || d.playerB === id)
  return members.flatMap((p) => {
    if (p.id === viewer) return [{ profile: p, extra: { value: p.xp }, order: [-p.xp] }]
    const together = vs(p.id)
    if (together.length === 0) return []
    return [{ profile: p, extra: { value: p.xp, ...recordOf(together, viewer) }, order: [-p.xp] }]
  })
}

function entriesOf(store: MemoryStore, q: BoardRepoQuery): Ranked[] {
  const members = [...store.profiles.values()].filter((p) => !p.isGuest)
  switch (q.kind) {
    case 'duels':
      return duelEntries(store, members)
    case 'streaks':
      return streakEntries(members, q.liveFrom)
    case 'herders':
      return members
        .filter((p) => p.xp > 0)
        .map((p) => ({ profile: p, extra: { value: p.xp }, order: [-p.xp] }))
    case 'games':
      return gameEntries(store, members, q.sinceMs)
    case 'friends':
      return friendEntries(store, members, q.viewer)
  }
}

function compare(a: Ranked, b: Ranked): number {
  for (let i = 0; i < a.order.length; i += 1) {
    const d = (a.order[i] ?? 0) - (b.order[i] ?? 0)
    if (d !== 0) return d
  }
  return compareIds(a.profile.id, b.profile.id)
}

const ranked = (store: MemoryStore, q: BoardRepoQuery): Ranked[] =>
  entriesOf(store, q).sort(compare)

export function memoryBoards(store: MemoryStore): BoardsRepo {
  return {
    top: async (q) =>
      ranked(store, q)
        .slice(0, LEADERBOARD_LIMIT)
        .map(({ profile: p, extra }) => ({
          userId: p.id,
          username: p.username,
          xp: p.xp,
          avatarSpecies: p.avatarSpecies,
          goldFrameUntil: p.goldFrameUntil,
          lastSeenAt: store.presence.get(p.id)?.at ?? null,
          lastActivity: store.presence.get(p.id)?.activity ?? null,
          ...extra,
        })),
    placeOf: async (q, userId) => {
      const all = ranked(store, q)
      const index = all.findIndex((r) => r.profile.id === userId)
      const hit = all[index]
      return hit ? { rank: index + 1, value: hit.extra.value } : null
    },
  }
}
