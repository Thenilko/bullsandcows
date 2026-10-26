import { bullsCows, codes, filterCandidates } from '@bc/game-core'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRepo } from '../adapters/repo/memory'
import { applyGuess } from '../duel/guess'
import { giveUp } from '../duel/match'
import { PLAY_AT, alice, bob, ok, raceInPlay } from '../duel/testing'
import { withPlayer, type Match, type Seat, type Secrets } from '../duel/types'
import type { Repo } from '../ports/repo'
import { comebackOf, recordResult, resultIds } from './persist'
import type { PendingResult } from './state'

/** The race fixture's shared secret (rng 0 picks the first code). */
const SECRET = '1234'

interface Game {
  readonly match: Match
  readonly secrets: Secrets
}

const guess = (g: Game, seat: Seat, code: string, at: number): Game =>
  ok(applyGuess(g.match, g.secrets, seat, code, at))

/**
 * `seat` guesses the first candidate that is not the secret until exactly one is left: the
 * way a player who knows the answer for the next move looks.
 */
function downToOne(g: Game, seat: Seat, from: number): Game {
  let cur = g
  let cands = codes(4, false)
  let at = from
  while (cands.length > 1) {
    const code = cands.find((c) => c !== SECRET)!
    cands = filterCandidates(cands, code, bullsCows(SECRET, code))
    at += 1_000
    cur = guess(cur, seat, code, at)
  }
  return cur
}

describe('comebackOf', () => {
  it('is a comeback when the loser was down to one candidate and the winner solved first', () => {
    const cornered = downToOne(raceInPlay('friend'), 'b', PLAY_AT)
    expect(cornered.match.players.b?.left).toBe(1)
    const won = guess(cornered, 'a', SECRET, PLAY_AT + 60_000)
    expect(won.match.outcome).toEqual({ winner: 'a', reason: 'solved' })
    expect(comebackOf(won.match)).toBe(true)
  })

  it('is no comeback when the loser never got that close, solved as well, or nobody won', () => {
    const one = guess(raceInPlay('friend'), 'b', '5678', PLAY_AT + 1_000)
    const won = guess(one, 'a', SECRET, PLAY_AT + 2_000)
    expect(comebackOf(won.match)).toBe(false)
    const walkover = ok(
      giveUp(raceInPlay('friend').match, raceInPlay('friend').secrets, 'b', PLAY_AT + 500),
    )
    expect(comebackOf(walkover.match)).toBe(false)
    const cornered = downToOne(raceInPlay('friend'), 'b', PLAY_AT)
    const solvedByLoser = guess(cornered, 'b', SECRET, PLAY_AT + 60_000)
    expect(solvedByLoser.match.outcome?.winner).toBe('b')
    expect(comebackOf(solvedByLoser.match)).toBe(false)
    expect(comebackOf({ ...won.match, outcome: { winner: null, reason: 'draw' } })).toBe(false)
  })
})

describe('recordResult', () => {
  let repo: Repo
  const clock = { now: () => PLAY_AT }

  beforeEach(async () => {
    repo = createMemoryRepo(clock)
    for (const p of [alice, bob]) {
      await repo.profiles.create({ id: p.id, username: p.username, email: null, isGuest: false })
    }
  })

  const pending = (g: Game): PendingResult => ({
    match: g.match,
    secrets: g.secrets,
    ids: resultIds(g.match),
    inviteCode: null,
    attempts: 0,
    retryAt: PLAY_AT,
  })

  it('writes the rows with notes, rematch and comeback, pays the badges and returns them per user', async () => {
    const cornered = downToOne(raceInPlay('friend'), 'b', PLAY_AT)
    const noted = { ...cornered, match: withPlayer(cornered.match, 'a', { usedNotes: true }) }
    const won = guess(noted, 'a', SECRET, PLAY_AT + 60_000)
    const r = pending({ ...won, match: { ...won.match, isRematch: true } })
    const badges = await recordResult(repo, r)
    expect(badges[alice.id]).toEqual(
      expect.arrayContaining([
        { key: 'duelist', tier: 1 },
        { key: 'comeback', tier: 1 },
        { key: 'rematch', tier: 1 },
      ]),
    )
    expect(badges[bob.id]).toEqual([{ key: 'rematch', tier: 1 }])
    const duel = await repo.duels.get(r.ids.duelId)
    expect(duel).toMatchObject({ isRematch: true, comeback: true, winner: alice.id })
    expect(await repo.games.get(r.ids.gameA!)).toMatchObject({ won: true, usedNotes: true })
    expect(await repo.games.get(r.ids.gameB!)).toMatchObject({ won: false, usedNotes: false })
    const a = await repo.profiles.get(alice.id)
    expect(a?.xp).toBe(120 + 50 * (badges[alice.id]?.length ?? 0))
    expect((await repo.profiles.get(bob.id))?.xp).toBe(40 + 50)
  })

  it('is idempotent on a retry: same rows, no extra XP, nothing new', async () => {
    const won = guess(raceInPlay('friend'), 'a', SECRET, PLAY_AT + 1_000)
    const r = pending(won)
    const first = await recordResult(repo, r)
    const xp = (await repo.profiles.get(alice.id))?.xp
    const states = await repo.badges.listOf(alice.id)
    const again = await recordResult(repo, r)
    expect(first[alice.id]?.length).toBeGreaterThan(0)
    expect(again).toEqual({ [alice.id]: [], [bob.id]: [] })
    expect((await repo.profiles.get(alice.id))?.xp).toBe(xp)
    expect(await repo.badges.listOf(alice.id)).toEqual(states)
    expect(await repo.games.history(alice.id, 10)).toHaveLength(1)
  })
})
