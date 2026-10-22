import { shareText, type Len, type ShareRow, type ShareTextInput } from '@bc/game-core'
import type { PublicState } from '@bc/protocol'
import type { Outcome } from '../../screens/duel/duelUtils'
import type { ResultModel } from '../../screens/result/resultModel'
import { publicUrl } from './publicUrl'

/** Everything the share sheet needs: the text (from game-core), what the card draws and where to report. */
export interface ShareModel {
  readonly input: ShareTextInput
  readonly text: string
  /** The finished game for `POST /api/shares`; null when the client knows no game id (duels). */
  readonly gameId: string | null
  readonly fileName: string
  /** When the game ended; the daily card shows its date. */
  readonly finishedAt: number | null
}

const FILE_PREFIX = 'bikove-i-kravi'

function fileNameOf(input: ShareTextInput): string {
  switch (input.kind) {
    case 'daily':
      return `${FILE_PREFIX}-${input.dailyNumber}.png`
    case 'free':
      return `${FILE_PREFIX}-svobodna.png`
    case 'duel':
      return `${FILE_PREFIX}-duel.png`
  }
}

function build(input: ShareTextInput, gameId: string | null, finishedAt: number | null): ShareModel {
  return { input, text: shareText(input), gameId, fileName: fileNameOf(input), finishedAt }
}

/** A solo result (daily or free). */
export function shareFromResult(model: ResultModel): ShareModel {
  const base = { len: model.len, rows: model.rows, publicUrl: publicUrl(), won: model.won, secs: model.secs }
  const input: ShareTextInput =
    model.daily && model.dailyNumber !== null
      ? { kind: 'daily', ...base, dailyNumber: model.dailyNumber, top: model.won ? model.top : null }
      : { kind: 'free', ...base }
  return build(input, model.id, model.finishedAt)
}

/** My side of a duel (human or bot): only my rows, the opponent's name and the outcome. */
export function shareFromDuel(state: PublicState, outcome: Outcome, opponent: string): ShareModel {
  const rows: ShareRow[] = state.me.guesses.map((g) => ({ bulls: g.bulls, cows: g.cows }))
  const input: ShareTextInput = {
    kind: 'duel',
    len: state.len as Len,
    rows,
    publicUrl: publicUrl(),
    opponent,
    outcome,
  }
  return build(input, null, state.endedAt)
}
