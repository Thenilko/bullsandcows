import { isSuspicious } from '@bc/game-core'
import type { NewBadgeDto } from '@bc/protocol'
import { settle, type Settlement } from '../duel/settle'
import {
  otherSeat,
  targetOf,
  type Match,
  type Player,
  type Secrets,
  type Seat,
} from '../duel/types'
import type { DuelReward, GameKind, Repo } from '../ports/repo'
import { leftAfterEach } from '../solo/evaluate'
import { guessEvents, type BadgeEvent } from '../stats/badgeMetrics'
import { recomputeBadges } from '../stats/badgeService'
import type { PendingResult, ResultIds } from './state'

/** The synthetic id of the bot seat; it has no profile and no rows. */
export const BOT_ID = 'bot'

const SEATS: readonly Seat[] = ['a', 'b']

/** Badge tiers each human player earned from a recorded result, by user id. */
export type NewBadgesByUser = Readonly<Record<string, readonly NewBadgeDto[]>>

const isHuman = (p: Player | null): p is Player => p !== null && p.id !== BOT_ID

function gameKind(m: Match): GameKind {
  if (m.opponentKind === 'bot') return 'bot'
  return m.format === 'race' ? 'duel_race' : 'duel_classic'
}

const solvedBy = (p: Player, len: number): boolean => p.guesses.some((g) => g.bulls === len)

/**
 * The loser had exactly one candidate left after some guess that did not solve (badge
 * „comeback“ for the winner). A draw or an abandoned match is never a comeback.
 */
export function comebackOf(m: Match): boolean {
  const winner = m.outcome?.winner ?? null
  const loser = winner === null ? null : m.players[otherSeat(winner)]
  if (!loser) return false
  const lefts = leftAfterEach(m.len, m.zero, loser.guesses)
  return lefts.some((left, i) => left === 1 && loser.guesses[i]?.bulls !== m.len)
}

/** The one-off events of a seat's game, for the hidden badges and „allCows“. */
function eventsOf(m: Match, s: Secrets, seat: Seat, won: boolean): BadgeEvent[] {
  const target = targetOf(m, s, seat)
  const p = m.players[seat]
  return target === null || !p ? [] : guessEvents(target, p.guesses, m.len, won)
}

/** One game row for a human seat, finished, with the anti-cheat flag. */
async function recordGame(
  repo: Repo,
  m: Match,
  s: Secrets,
  seat: Seat,
  result: Settlement,
  id: string,
): Promise<string> {
  const p = m.players[seat]!
  const game = await repo.games.create({
    id,
    userId: p.id,
    kind: gameKind(m),
    len: m.len,
    zero: m.zero,
    secret: targetOf(m, s, seat) ?? '',
    dailyDate: null,
    practice: false,
  })
  const startedAt = m.startedAt ?? m.createdAt
  await repo.games.update(game.id, {
    startedAt: m.startedAt,
    finishedAt: m.endedAt,
    attempts: p.guesses.length,
    wasted: p.guesses.filter((g) => !g.consistent).length,
    won: result.outcome[seat] === 'win',
    score: 0,
    suspicious: isSuspicious(
      p.guesses.map((g) => g.at),
      startedAt,
      m.len,
      solvedBy(p, m.len),
    ),
    usedNotes: p.usedNotes === true,
  })
  return game.id
}

/** Fresh row ids for a match's result: one duel, one game per human seat. */
export function resultIds(m: Match): ResultIds {
  const gameId = (seat: Seat) => (isHuman(m.players[seat]) ? crypto.randomUUID() : null)
  return { duelId: crypto.randomUUID(), gameA: gameId('a'), gameB: gameId('b') }
}

function rewardsOf(m: Match, result: Settlement): DuelReward[] {
  return SEATS.flatMap((seat) => {
    const p = m.players[seat]
    if (!isHuman(p)) return []
    const opponent = m.players[seat === 'a' ? 'b' : 'a']
    const ratingUpdate =
      result.ratings && opponent
        ? { opponent: opponent.rating, outcome: result.outcome[seat] }
        : null
    return [{ userId: p.id, xp: result.xp[seat], ratingUpdate }]
  })
}

/**
 * Badges of every human seat once the rows and the rewards are in: a retry recomputes the
 * same facts, so it finds nothing new. A user without a profile row gets nothing.
 */
async function badgesOf(
  repo: Repo,
  r: PendingResult,
  result: Settlement,
): Promise<NewBadgesByUser> {
  const { match: m, secrets: s } = r
  const now = m.endedAt ?? m.createdAt
  const entries: [string, readonly NewBadgeDto[]][] = []
  for (const seat of SEATS) {
    const p = m.players[seat]
    if (!isHuman(p) || !(await repo.profiles.get(p.id))) continue
    const won = result.outcome[seat] === 'win'
    const events = eventsOf(m, s, seat, won)
    entries.push([
      p.id,
      await recomputeBadges(repo, { userId: p.id, scope: 'game', now, events, payXp: true }),
    ])
  }
  return Object.fromEntries(entries)
}

/**
 * Writes an ended match: a game per human seat and one duel row (all with the ids chosen at
 * claim time, so a retry rewrites the same rows), then XP and (quick matches only, via
 * `settle`) the new ratings, which the repo credits exactly once per duel, and finally the
 * badges. Returns the badge tiers earned per user.
 */
export async function recordResult(repo: Repo, r: PendingResult): Promise<NewBadgesByUser> {
  const { match: m, secrets: s, ids } = r
  const result = settle(m)
  const b = m.players.b
  const gameA = ids.gameA && (await recordGame(repo, m, s, 'a', result, ids.gameA))
  const gameB = ids.gameB && (await recordGame(repo, m, s, 'b', result, ids.gameB))
  await repo.duels.create({
    id: ids.duelId,
    format: m.format,
    len: m.len,
    zero: m.zero,
    opponentKind: m.opponentKind,
    botLevel: m.botLevel,
    inviteCode: r.inviteCode,
    playerA: m.players.a.id,
    playerB: isHuman(b) ? b.id : null,
    gameA,
    gameB,
    isRematch: m.isRematch === true,
    comeback: comebackOf(m),
  })
  const winner = m.outcome?.winner ? m.players[m.outcome.winner] : null
  await repo.duels.finish(ids.duelId, {
    winner: isHuman(winner) ? winner.id : null,
    outcome: m.outcome?.reason ?? null,
    ratingDeltaA: result.ratingDelta?.a.delta ?? null,
    ratingDeltaB: result.ratingDelta?.b.delta ?? null,
    finishedAt: m.endedAt ?? undefined,
  })
  await repo.duels.applyRewards(ids.duelId, rewardsOf(m, result))
  return badgesOf(repo, r, result)
}
