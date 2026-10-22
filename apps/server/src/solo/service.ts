import {
  bullsCows,
  codes,
  dailyIndex,
  dailySecret,
  dailyXp,
  filterCandidates,
  freeXp,
  isConsistent,
  isSuspicious,
  isValidCode,
  scoreSolo,
  sofiaDate,
  starsFromTop,
  totalCodes,
  type Len,
} from '@bc/game-core'
import type { ErrorCode } from '@bc/protocol'
import type { AuthUser } from '../ports/auth'
import type { Clock } from '../ports/clock'
import { isDuplicate } from '../ports/errors'
import type { GameRow, GuessRow, NewGuess, PublicGameRow, Repo } from '../ports/repo'
import { StatsService } from '../stats/service'
import { topOfGame, type DistributionSource } from '../stats/top'
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
  /** Where "top X%" of a finished game is measured; the stats service unless given. */
  readonly distributions?: DistributionSource
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
  private readonly distributions: DistributionSource

  constructor(private readonly deps: SoloDeps) {
    this.distributions =
      deps.distributions ?? new StatsService({ repo: deps.repo, clock: deps.clock })
  }

  async create(user: AuthUser, input: CreateInput): Promise<GameView> {
    const { repo } = this.deps
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
    return this.createDaily(user, len, zero)
  }

  private async createDaily(user: AuthUser, len: Len, zero: boolean): Promise<GameView> {
    const { repo, clock } = this.deps
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
    try {
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
    } catch (err) {
      // A simultaneous request created the counted game first: resume that one.
      const winner = isDuplicate(err) ? await repo.games.dailyOf(user.id, date, len, zero) : null
      if (winner) return this.view(winner)
      throw err
    }
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
    const row = await this.addGuessOnce({ gameId, guess, ...verdict, consistent, at: clock.now() })
    const attempts = previous.length + 1
    const wasted = [...previous, row].filter((r) => !r.consistent).length
    const solved = verdict.bulls === game.len
    if (!solved) {
      await repo.games.update(gameId, { attempts, wasted })
      return { ...verdict, consistent, left, solved }
    }
    const score = await this.finishWin(user, game, [...previous, row], attempts, wasted)
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
    wasted: number,
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
    const finished = await repo.games.update(game.id, {
      attempts,
      wasted,
      finishedAt,
      won: true,
      score,
      suspicious,
    })
    if (!game.practice) await this.reward(user, finished)
    return score
  }

  /**
   * XP of a counted win: the number of the day pays 150 + 20 per star; a free game 40 + 12 per
   * star for the first ten of the Sofia day, then 10. Stars come from "top X%" against the
   * distribution the result screen shows. A user without a profile row is skipped by addXp.
   */
  private async reward(user: AuthUser, game: PublicGameRow): Promise<void> {
    const { repo, clock } = this.deps
    const today = sofiaDate(new Date(clock.now()))
    const stars = starsFromTop(await topOfGame(this.distributions, game, today))
    const xp =
      game.kind === 'daily'
        ? dailyXp(stars)
        : freeXp(stars, await repo.games.countFreeGamesOn(user.id, today))
    await repo.profiles.addXp(user.id, xp)
  }

  /** The same guess sent twice at once passes the repeat check twice; the unique index decides. */
  private async addGuessOnce(guess: NewGuess): Promise<GuessRow> {
    try {
      return await this.deps.repo.games.addGuess(guess)
    } catch (err) {
      if (isDuplicate(err)) throw new SoloError('ERR_REPEAT')
      throw err
    }
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
