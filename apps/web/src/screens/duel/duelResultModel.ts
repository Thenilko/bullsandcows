import type { PublicState, RatingChangeDto } from '@bc/protocol'
import type { TFunction } from 'i18next'
import { rankKeyOf } from '../../lib/rank'
import type { TileData } from '../result/ResultCard'
import { fmtClock, type Outcome } from './duelUtils'
import type { ResultRow } from './parts/ResultRows'

// Light green / light red behind the rating tile, as the points tile is tinted in the solo result.
const GAIN = { tint: '#DCEFD0', color: '#2E5E1E' } as const
const LOSS = { tint: '#F6DCD3', color: '#8A1F0B' } as const
const XP_TINT = '#F6E3B4'

/** Which `outcome.reason.*` line explains the ending, if any. */
export function reasonKey(reason: string, outcome: Outcome): string | null {
  const side = outcome === 'win' ? 'Opp' : 'Self'
  switch (reason) {
    case 'giveUp':
      return `outcome.reason.forfeit${side}`
    case 'timeout':
      return `outcome.reason.timeout${side}`
    case 'disconnect':
      return `outcome.reason.disconnect${side}`
    case 'cap':
      return 'outcome.reason.ceiling'
    default:
      return null
  }
}

/**
 * The kicker over the title, as the solo „ЧИСЛОТО Е 5274“: the race's one number, both numbers of a classic
 * duel; the format (or the bot's level) while the numbers are not known.
 */
export function kickerOf(
  t: TFunction,
  state: PublicState,
  secrets: PublicState['secrets'],
  outcome: Outcome,
  mode: string,
): string {
  if (!secrets) return mode
  if (state.format === 'classic') {
    return t('duel.result.kicker.classic', {
      theirs: secrets.theirs ?? '—',
      mine: secrets.mine ?? '—',
    })
  }
  const secret = secrets.mine ?? secrets.theirs ?? '—'
  return t(outcome === 'win' ? 'result.kicker.win' : 'result.kicker.lose', { secret })
}

/** The match length, from the start to the end. */
export function matchClock(state: Pick<PublicState, 'startedAt' | 'endedAt'>): string {
  return state.startedAt && state.endedAt ? fmtClock(state.endedAt - state.startedAt) : '—'
}

/** The stat tiles: my attempts, the match time, then the XP and the rating change when there are any. */
export function tilesOf(
  t: TFunction,
  state: PublicState,
  xp: number | null,
  rating: RatingChangeDto | null,
): TileData[] {
  const base: TileData[] = [
    { value: state.me.guesses.length, label: t('result.stat.attempts') },
    { value: matchClock(state), label: t('result.stat.time') },
  ]
  const xpTile: TileData[] =
    xp === null ? [] : [{ value: `+${xp}`, label: t('duel.result.stat.xp'), tint: XP_TINT }]
  const ratingTile: TileData[] = rating
    ? [
        {
          value: `${rating.delta >= 0 ? '+' : ''}${rating.delta}`,
          label: t('duel.result.stat.rating', { to: rating.to }),
          ...(rating.delta >= 0 ? GAIN : LOSS),
        },
      ]
    : []
  return [...base, ...xpTile, ...ratingTile]
}

/** Both players' rows: attempts, the time of who solved it, solved or not. */
export function buildRows(
  state: PublicState,
  outcome: Outcome,
  reason: string,
  names: { me: string; opp: string },
): ResultRow[] {
  const mine = state.me.guesses.some((g) => g.bulls === state.len)
  const theirs = state.opp?.guesses.some((g) => g.bulls === state.len) === true
  const mySolved = mine || (reason === 'solved' && outcome !== 'lose')
  const oppSolved = theirs || (reason === 'solved' && outcome !== 'win')
  const clock = matchClock(state)
  return [
    {
      name: names.me,
      kind: 'me',
      rankKey: rankKeyOf(state.me),
      species: state.me.avatarSpecies,
      attempts: state.me.guesses.length,
      time: mySolved ? clock : '—',
      solved: mySolved,
    },
    {
      name: names.opp,
      kind: state.opponentKind === 'bot' ? 'bot' : 'human',
      rankKey: state.opp ? rankKeyOf(state.opp) : undefined,
      species: state.opp?.avatarSpecies,
      attempts: state.opp?.guesses.length ?? 0,
      time: oppSolved ? clock : '—',
      solved: oppSolved,
    },
  ]
}
