import type { DuelFormat } from '@bc/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cta, RankAvatar, Seg, Soft } from '../../components/ui'
import { Sheet } from '../../components/ui/Sheet'
import type { ChallengeTarget } from './BoardRows'

const FORMATS: readonly DuelFormat[] = ['classic', 'race']
const CHIP = { background: '#FFFFFF', border: '1.5px solid #DCD4BF' } as const
const HEAD = { display: 'flex', alignItems: 'center', gap: 12 } as const
const TEXT = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: '#4A5640',
  lineHeight: 1.45,
} as const
const LABEL = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: '.06em',
  color: 'var(--c-muted-aa)',
} as const

export interface ChallengeConfirmProps {
  row: ChallengeTarget
  len: number
  zero: boolean
  sending: boolean
  /** Already translated. */
  error: string | null
  onSend(format: DuelFormat): void
  onClose(): void
}

/** „Предизвикай {{name}}“: the board's digits and zero as chips, race or classic, Изпрати / Отказ. */
export function ChallengeConfirm({
  row,
  len,
  zero,
  sending,
  error,
  onSend,
  onClose,
}: ChallengeConfirmProps) {
  const { t } = useTranslation()
  const [format, setFormat] = useState<DuelFormat>('classic')
  const title = t('challenge.confirm.title', { name: row.username })
  return (
    <Sheet label={title} onClose={onClose} variant="card" width={420} testId="challenge-confirm">
      <div style={HEAD}>
        <RankAvatar
          species={row.avatarSpecies}
          rankKey={row.rankKey}
          size={48}
          gold={row.goldFrame === true}
        />
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, overflowWrap: 'anywhere' }}>
          {title}
        </h2>
      </div>
      <p style={TEXT}>{t('challenge.confirm.text')}</p>
      {row.playing === true ? (
        <p role="note" style={{ ...TEXT, color: '#35602a', fontWeight: 800 }}>
          {t('challenge.confirm.playing', { name: row.username })}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span className="tag" style={CHIP}>
          {t('common.digits', { count: len })}
        </span>
        <span className="tag" style={CHIP}>
          {t(zero ? 'newGame.chip.zero' : 'newGame.chip.noZero')}
        </span>
      </div>
      <span style={LABEL}>{t('challenge.confirm.format')}</span>
      <Seg<DuelFormat>
        label={t('challenge.confirm.format')}
        value={format}
        options={FORMATS.map((f) => ({ value: f, label: t(`newGame.format.${f}.name`) }))}
        onChange={setFormat}
      />
      {error ? (
        <p role="alert" style={{ ...TEXT, color: '#8A1F0B', fontWeight: 800 }}>
          {error}
        </p>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Soft onClick={onClose}>{t('challenge.confirm.cancel')}</Soft>
        <Cta disabled={sending} onClick={() => onSend(format)}>
          {t('challenge.confirm.send')}
        </Cta>
      </div>
    </Sheet>
  )
}
