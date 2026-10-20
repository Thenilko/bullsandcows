import {
  bullsCows,
  codes,
  dailyIndex,
  dailySecret,
  filterCandidates,
  isConsistent,
  isSuspicious,
  isValidCode,
  scoreSolo,
  sofiaDate,
  totalCodes,
  type Len,
} from '@bc/game-core'
import type { ErrorCode } from '@bc/protocol'
import type { AuthUser } from '../ports/auth'
import type { Clock } from '../ports/clock'
import type { GameRow, GuessRow, PublicGameRow, Repo } from '../ports/repo'
import { candidatesAfter, leftAfterEach } from './evaluate'
import type { CreateInput, GameView, GuessResult } from './types'

export class SoloError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code)
    this.name = 'SoloError'
  }
}

export interface SoloDeps {
  readonly repo: Repo
  readonly clock: Clock
  readonly dailySalt: string
}

type SoloKind = GameView['kind']

const isSoloKind = (kind: string): kind is SoloKind => kind === 'daily' || kind === 'free'

/**
 * Uniform pick from `list`. A 32-bit value modulo at most 30240 codes has a bias below 1e-5,
 * which is negligible for a casual game's secret.
 */
function randomCode(list: readonly string[]): string {
  const [value] = crypto.getRandomValues(new Uint32Array(1))
  return list[(value ?? 0) % list.length] as string
}

const toGuessEntries = (rows: readonly GuessRow[], lefts: readonly number[]) =>
  rows.map((r, i) => ({
    guess: r.guess,
    bulls: r.bulls,
    cows: r.cows,
    consistent: r.consistent,
    left: lefts[i] ?? 0,
  }))

export class SoloService {
  constructor(private readonly deps: SoloDeps) {}

  async create(user: AuthUser, input: CreateInput): Promise<GameView> {
    const { repo, clock } = this.deps
    const { len, zero } = input
    if (input.kind === 'free') {
      if (input.secretOverride !== undefined && !isValidCode(input.secretOverride, len, zero)) {
        throw new SoloError('ERR_CODE')
      }
      const secret = input.secretOverride ?? randomCode(codes(len, zero))
      const game = await repo.games.create({
        userId: user.id,
        kind: 'free',
        len,
        zero,
        secret,
        dailyDate: null,
        practice: false,
      })
      return this.view(game)
    }
    const date = sofiaDate(new Date(clock.now()))
    const counted = await repo.games.dailyOf(user.id, date, len, zero)
    // An unfinished counted game is resumed; the unique index allows only one per key.
    if (counted && counted.finishedAt === null) return this.view(counted)
    const practice = counted !== null
    if (!practice) {
      await repo.games.recordDailyNumber(
        date,
        len,
        zero,
        dailyIndex(this.deps.dailySalt, date, len, zero),
      )
    }
    const game = await repo.games.create({
      userId: user.id,
      kind: 'daily',
      len,
      zero,
      secret: dailySecret(this.deps.dailySalt, date, len, zero),
      dailyDate: date,
      practice,
    })
    return this.view(game)
  }

  async start(user: AuthUser, gameId: string): Promise<{ startedAt: number }> {
    const game = await this.owned(user, gameId)
    if (game.startedAt !== null) return { startedAt: game.startedAt }
    const startedAt = this.deps.clock.now()
    await this.deps.repo.games.update(gameId, { startedAt })
    return { startedAt }
  }

  async guess(user: AuthUser, gameId: string, guess: string): Promise<GuessResult> {
    const { repo, clock } = this.deps
    const game = await this.ownedWithSecret(user, gameId)
    if (game.startedAt === null) throw new SoloError('ERR_NOT_STARTED')
    if (game.finishedAt !== null) throw new SoloError('ERR_FINISHED')
    if (!isValidCode(guess, game.len, game.zero)) throw new SoloError('ERR_CODE')
    const previous = await repo.games.guesses(gameId)
    if (previous.some((p) => p.guess === guess)) throw new SoloError('ERR_REPEAT')

    const before = candidatesAfter(game.len, game.zero, previous)
    const verdict = bullsCows(game.secret, guess)
    const consistent = isConsistent(before, guess)
    const left = filterCandidates(before, guess, verdict).length
    const at = clock.now()
    const row = await repo.games.addGuess({ gameId, guess, ...verdict, consistent, at })
    const attempts = previous.length + 1
    const solved = verdict.bulls === game.len
    if (!solved) {
      await repo.games.update(gameId, { attempts })
      return { ...verdict, consistent, left, solved }
    }
    const score = await this.finishWin(user, game, [...previous, row], attempts)
    return { ...verdict, consistent, left, solved, score }
  }

  async giveUp(user: AuthUser, gameId: string): Promise<{ secret: string }> {
    const game = await this.ownedWithSecret(user, gameId)
    if (game.finishedAt !== null) throw new SoloError('ERR_FINISHED')
    await this.deps.repo.games.update(gameId, {
      finishedAt: this.deps.clock.now(),
      won: false,
      score: 0,
    })
    return { secret: game.secret }
  }

  async get(user: AuthUser, gameId: string): Promise<GameView> {
    return this.view(await this.owned(user, gameId))
  }

  private async finishWin(
    user: AuthUser,
    game: GameRow,
    rows: readonly GuessRow[],
    attempts: number,
  ): Promise<number> {
    const { repo, clock } = this.deps
    const finishedAt = clock.now()
    const startedAt = game.startedAt ?? finishedAt
    const secs = Math.max(1, Math.round((finishedAt - startedAt) / 1000))
    const score = game.practice ? 0 : scoreSolo(attempts, secs, game.len)
    const suspicious = isSuspicious(
      rows.map((r) => r.at),
      startedAt,
      game.len,
      true,
    )
    await repo.games.update(game.id, { attempts, finishedAt, won: true, score, suspicious })
    // A user without a profile row yet is skipped by addXp (returns null).
    if (!game.practice) await repo.profiles.addXp(user.id, score)
    return score
  }

  private async owned(user: AuthUser, gameId: string): Promise<PublicGameRow> {
    const game = await this.deps.repo.games.get(gameId)
    if (!game || game.userId !== user.id || !isSoloKind(game.kind)) {
      throw new SoloError('ERR_NOT_FOUND')
    }
    return game
  }

  private async ownedWithSecret(user: AuthUser, gameId: string): Promise<GameRow> {
    const game = await this.deps.repo.games.getWithSecret(gameId)
    if (!game || game.userId !== user.id || !isSoloKind(game.kind)) {
      throw new SoloError('ERR_NOT_FOUND')
    }
    return game
  }

  /** The secret is fetched, explicitly, only for a finished game. */
  private async view(game: PublicGameRow): Promise<GameView> {
    const { repo } = this.deps
    if (!isSoloKind(game.kind)) throw new SoloError('ERR_NOT_FOUND')
    const rows = await repo.games.guesses(game.id)
    const lefts = leftAfterEach(game.len, game.zero, rows)
    const finished = game.finishedAt !== null
    const secret = finished ? (await repo.games.getWithSecret(game.id))?.secret : undefined
    return {
      id: game.id,
      kind: game.kind,
      len: game.len as Len,
      zero: game.zero,
      practice: game.practice,
      total: totalCodes(game.len, game.zero),
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
      won: game.won,
      score: finished ? game.score : null,
      attempts: game.attempts,
      guesses: toGuessEntries(rows, lefts),
      ...(secret === undefined ? {} : { secret }),
    }
  }
}
