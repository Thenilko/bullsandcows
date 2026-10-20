import { progress, rankKeyForStars, starsFromTop, topOf, type Len, type Stars } from '@bc/game-core'
import type { DistributionDto, GameViewDto } from '@bc/protocol'
import { sceneAnimals } from '../../components/scene'
import type { SceneProps } from '../../app/layouts/Shell'

export const BAR_MINE = '#B5452F'
export const BAR_OTHER = '#A9D18B'
const MIN_BAR = 6
const BAR_DELAY = 0.3
const BAR_STEP = 0.04

export interface ResultBar {
  h: string
  c: string
  d: string
}

export interface ResultModel {
  id: string
  won: boolean
  practice: boolean
  daily: boolean
  fallback: boolean
  len: Len
  secret: string
  attempts: number
  clock: string
  score: number
  logic: number
  wasted: number
  top: number
  beat: number
  avg: number
  stars: Stars
  rankKey: ReturnType<typeof rankKeyForStars>
  bars: readonly ResultBar[]
  scene: SceneProps
}

/** `m:ss` for a duration in seconds. */
export function formatClock(secs: number): string {
  const s = Math.max(0, Math.round(secs))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function isFinished(game: GameViewDto): boolean {
  return game.finishedAt !== null && game.won !== null && game.secret !== undefined
}

function buildBars(histogram: readonly number[], mineIdx: number | null): ResultBar[] {
  const max = Math.max(...histogram, 1)
  return histogram.map((v, i) => ({
    h: `${Math.max(MIN_BAR, Math.round((v / max) * 100))}%`,
    c: i === mineIdx ? BAR_MINE : BAR_OTHER,
    d: `${(BAR_DELAY + i * BAR_STEP).toFixed(2)}s`,
  }))
}

function buildScene(game: GameViewDto, won: boolean): SceneProps {
  const last = game.guesses[game.guesses.length - 1]
  const prog = progress(won ? 1 : (last?.left ?? game.total), game.total)
  return {
    fog: prog.fog,
    sunY: prog.sunY,
    dawn: prog.dawn,
    animals: sceneAnimals({ kind: 'result', bulls: won ? game.len : (last?.bulls ?? 0) }),
    parity: game.attempts % 2 === 0,
    miss: false,
  }
}

/** Everything the result screen shows, derived from a finished game and the player distribution. */
export function buildResult(game: GameViewDto, dist: DistributionDto): ResultModel {
  const won = game.won === true
  const n = game.attempts
  const T = topOf(n, dist.histogram)
  const top = won ? T.top : 100
  const stars = won ? starsFromTop(top) : 0
  const wasted = game.guesses.filter((g) => !g.consistent).length
  const secs = Math.max(1, Math.round(((game.finishedAt ?? 0) - (game.startedAt ?? 0)) / 1000))
  return {
    id: game.id,
    won,
    practice: game.practice,
    daily: game.kind === 'daily',
    fallback: dist.fallback,
    len: game.len,
    secret: game.secret ?? '',
    attempts: n,
    clock: formatClock(secs),
    score: game.practice ? 0 : (game.score ?? 0),
    logic: n > 0 ? Math.round(((n - wasted) / n) * 100) : 0,
    wasted,
    top,
    beat: won ? T.beat : 0,
    avg: T.avg,
    stars,
    rankKey: rankKeyForStars(stars),
    bars: buildBars(dist.histogram, won ? T.idx : null),
    scene: buildScene(game, won),
  }
}
