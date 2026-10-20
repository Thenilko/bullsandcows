import { isSuspicious } from '@bc/game-core'
import { settle, type Settlement } from '../duel/settle'
import { targetOf, type Match, type Player, type Secrets, type Seat } from '../duel/types'
import type { GameKind, Repo } from '../ports/repo'

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
): Promise<string> {
  const p = m.players[seat]!
  const game = await repo.games.create({
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
      solved,
    ),
  })
  return game.id
}

/**
 * Writes an ended match: a game per human seat, one duel row, XP for humans and (quick
 * matches only, via `settle`) both new ratings. Called once per match, see `DuelRoom`.
 */
export async function recordResult(repo: Repo, m: Match, s: Secrets): Promise<void> {
  const result = settle(m)
  const b = m.players.b
  const gameOf = (seat: Seat) =>
    isHuman(m.players[seat]) ? recordGame(repo, m, s, seat, result) : Promise.resolve(null)
  const gameA = await gameOf('a')
  const gameB = await gameOf('b')
  const duel = await repo.duels.create({
    format: m.format,
    len: m.len,
    zero: m.zero,
    opponentKind: m.opponentKind,
    botLevel: m.botLevel,
    inviteCode: null,
    playerA: m.players.a.id,
    playerB: isHuman(b) ? b.id : null,
    gameA,
    gameB,
  })
  const winner = m.outcome?.winner ? m.players[m.outcome.winner] : null
  await repo.duels.finish(duel.id, {
    winner: isHuman(winner) ? winner.id : null,
    outcome: m.outcome?.reason ?? null,
    ratingDeltaA: result.ratingDelta?.a.delta ?? null,
    ratingDeltaB: result.ratingDelta?.b.delta ?? null,
    finishedAt: m.endedAt ?? undefined,
  })
  for (const seat of SEATS) {
    const p = m.players[seat]
    if (!isHuman(p)) continue
    if (result.xp[seat] > 0) await repo.profiles.addXp(p.id, result.xp[seat])
    const rating = result.ratings?.[seat]
    if (rating) await repo.profiles.setRating(p.id, rating)
  }
}
