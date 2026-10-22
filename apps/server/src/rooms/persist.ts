import { isSuspicious } from '@bc/game-core'
import { settle, type Settlement } from '../duel/settle'
import { targetOf, type Match, type Player, type Secrets, type Seat } from '../duel/types'
import type { DuelReward, GameKind, Repo } from '../ports/repo'
import { earnedByGame } from '../stats/badges'
import { fallbackTopOf } from '../stats/top'
import type { PendingResult, ResultIds } from './state'

/** The synthetic id of the bot seat; it has no profile and no rows. */
export const BOT_ID = 'bot'

const SEATS: readonly Seat[] = ['a', 'b']

const isHuman = (p: Player | null): p is Player => p !== null && p.id !== BOT_ID

function gameKind(m: Match): GameKind {
  if (m.opponentKind === 'bot') return 'bot'
  return m.format === 'race' ? 'duel_race' : 'duel_classic'
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
  const solved = p.guesses.some((g) => g.bulls === m.len)
  const startedAt = m.startedAt ?? m.createdAt
  const row = await repo.games.update(game.id, {
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
      solved,
    ),
  })
  // Badges are kept for good; a retry re-awards the same ones, which the repo ignores.
  await repo.badges.award(p.id, earnedByGame(row, fallbackTopOf(row)), m.endedAt ?? startedAt)
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
 * Writes an ended match: a game per human seat and one duel row (all with the ids chosen at
 * claim time, so a retry rewrites the same rows), then XP and (quick matches only, via
 * `settle`) the new ratings, which the repo credits exactly once per duel.
 */
export async function recordResult(repo: Repo, r: PendingResult): Promise<void> {
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
}
