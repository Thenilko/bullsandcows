import { pastureItem } from '@bc/game-core'
import type { PastureItemDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Cta, Soft } from '../../components/ui'
import { Sheet } from '../../components/ui/Sheet'
import { LockIcon, RewardIcon } from './RewardIcon'
import { requirementText } from './rewardText'

export interface RewardDetailProps {
  item: PastureItemDto
  onToggle(show: boolean): void
  onClose(): void
}

const MEDALLION = {
  position: 'relative',
  width: 150,
  height: 150,
  borderRadius: '50%',
  background: 'radial-gradient(#FFF6CF, #F3EEDF 70%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
} as const
const LOCK_BADGE = {
  position: 'absolute',
  right: 4,
  bottom: 4,
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: '#FFFDF6',
  border: '1.5px solid #ECE5D2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const
const KICKER = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: '.14em',
  color: 'var(--c-muted-aa)',
  textTransform: 'uppercase',
} as const
const MUTED = { fontSize: 13, fontWeight: 800, color: 'var(--c-muted-aa)' } as const
const BAR = { height: 12, borderRadius: 6, background: '#ECE5D2', overflow: 'hidden' } as const

/** A reward of „Твоето пасище“ up close: the drawing (locked ones too), what it is and how to get it. */
export function RewardDetail({ item, onToggle, onClose }: RewardDetailProps) {
  const { t } = useTranslation()
  const name = t(`pasture.item.${item.key}.name`)
  const toggle = pastureItem(item.key).toggle
  const progress = item.progress
  const fraction = progress ? Math.min(1, progress.current / Math.max(1, progress.target)) : 0
  return (
    <Sheet
      label={t('pasture.detail.aria', { name })}
      onClose={onClose}
      width={440}
      centered
      testId="reward-detail"
    >
      <span style={KICKER}>
        {item.unlocked ? t('pasture.detail.unlocked') : t('pasture.locked')}
      </span>
      <div style={MEDALLION}>
        <RewardIcon item={item.key} size={120} />
        {item.unlocked ? null : (
          <span style={LOCK_BADGE}>
            <LockIcon size={22} />
          </span>
        )}
      </div>
      <b style={{ fontSize: 24 }}>{name}</b>
      <span style={{ fontWeight: 700, color: '#4A5640', lineHeight: 1.45 }}>
        {t(`pasture.item.${item.key}.desc`)}
      </span>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={MUTED}>
          {t('pasture.detail.how')}: {requirementText(t, { ...item, progress: undefined })}
        </span>
        {progress && !item.unlocked ? (
          <>
            <div
              style={BAR}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.target}
              aria-valuenow={progress.current}
              aria-label={name}
            >
              <div
                className="hbar"
                style={{
                  height: '100%',
                  width: `${Math.round(fraction * 100)}%`,
                  background: '#5E9E46',
                }}
              />
            </div>
            <span style={MUTED} data-testid="reward-progress">
              {t('pasture.progress', progress)}
            </span>
          </>
        ) : null}
        {item.unlocked ? null : <span style={MUTED}>{t('pasture.detail.lockedNote')}</span>}
      </div>
      {item.unlocked && toggle ? (
        <Cta style={{ width: '100%' }} onClick={() => onToggle(!item.shown)}>
          {item.shown ? t('pasture.detail.hide') : t('pasture.detail.show')}
        </Cta>
      ) : null}
      <Soft style={{ width: '100%' }} onClick={onClose}>
        {t('common.close')}
      </Soft>
    </Sheet>
  )
}
