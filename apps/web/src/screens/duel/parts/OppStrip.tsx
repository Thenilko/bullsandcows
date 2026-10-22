import { progress, totalCodes, type Len } from '@bc/game-core'
import type { PublicState } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { rankKeyOf } from '../../../lib/rank'
import { Avatar } from './Avatar'

export type OppStatus = 'solved' | 'thinking' | 'waiting' | 'trying'

export interface OppStripProps {
  state: PublicState
  oppName: string
  status: OppStatus
  thinking: boolean
}

const TAG_STYLE: Readonly<Record<OppStatus, { background: string; color: string }>> = {
  solved: { background: '#B5452F', color: '#FFFFFF' },
  thinking: { background: '#ECE5D2', color: '#4A5640' },
  waiting: { background: '#ECE5D2', color: '#4A5640' },
  trying: { background: '#ECE5D2', color: '#4A5640' },
}

/** Opponent attempts, remaining candidates and progress bar (prototype `ostrip`). */
export function OppStrip({ state, oppName, status, thinking }: OppStripProps) {
  const { t } = useTranslation()
  const opp = state.opp
  if (!opp) return null
  const total = totalCodes(state.len as Len, state.zero)
  const width = Math.round(progress(Math.max(1, opp.left), total).prog * 100)
  return (
    <div className="ostrip rise" aria-label={oppName}>
      <Avatar
        kind={state.opponentKind === 'bot' ? 'bot' : 'human'}
        rankKey={rankKeyOf(opp)}
        species={opp.avatarSpecies}
        size={42}
        thinking={thinking}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <b style={{ fontSize: 15 }}>{oppName}</b>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#4A5640' }}>{t('duel.play.oppProgress', { attempt: opp.guesses.length, left: opp.left })}</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: '#E7E0CC', overflow: 'hidden' }}>
          <div data-testid="opp-progress" style={{ height: '100%', width: `${width}%`, background: '#4A7FB0', borderRadius: 3, transition: 'width .8s cubic-bezier(.3,1.2,.5,1)' }} />
        </div>
      </div>
      <span className="tag" style={TAG_STYLE[status]}>
        {t(`duel.play.oppStatus.${status}`)}
      </span>
    </div>
  )
}
