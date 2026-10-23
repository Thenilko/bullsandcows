import { useTranslation } from 'react-i18next'
import { fmtClock } from '../duelUtils'
import { TurnTimer, TurnWarning } from './TurnTimer'

export interface PlayHeaderProps {
  attempt: number
  /** Classic only: whose turn it is. */
  turn: 'me' | 'opp' | null
  msLeft: number | null
  warn: boolean
  clockMs: number
}

// Darker shades of the design's green/blue so the white tag text meets AA (4.6:1+; the originals are 3.3:1 / 4.2:1).
const TAG_COLORS = { me: '#4A8236', opp: '#4278A8' } as const
const ROW = { display: 'flex', alignItems: 'center', gap: 8 } as const

/** Attempt counter, turn tag, turn timer (with the 15 s warning) and the match clock. */
export function PlayHeader({ attempt, turn, msLeft, warn, clockMs }: PlayHeaderProps) {
  const { t } = useTranslation()
  return (
    <>
      <div style={{ ...ROW, justifyContent: 'space-between' }}>
        <div style={ROW}>
          <b style={{ fontSize: 16 }}>{t('duel.play.attempt', { attempt })}</b>
          {turn ? (
            <span className="tag" style={{ background: TAG_COLORS[turn], color: '#FFFFFF' }}>
              {t(`duel.play.turn.${turn}`)}
            </span>
          ) : null}
        </div>
        <div style={ROW}>
          {msLeft !== null ? <TurnTimer msLeft={msLeft} warn={warn} /> : null}
          <span className="ps-hud" style={{ background: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
            {fmtClock(clockMs)}
          </span>
        </div>
      </div>
      {warn && msLeft !== null && turn === 'me' ? <TurnWarning msLeft={msLeft} /> : null}
    </>
  )
}
