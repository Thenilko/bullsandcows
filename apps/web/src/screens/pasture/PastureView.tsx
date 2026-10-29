import { BARN_COLOR_KEYS, BARN_COLORS, PASTURE_KEYS, type BarnColor, type PastureKey } from '@bc/game-core'
import type { PastureDto, PastureItemDto } from '@bc/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Toggle } from '../../components/ui/Toggle'
import { cx } from '../../components/ui/cx'
import { isAllUnlocked, toggleItems, unlockedCount } from '../../features/pasture/pastureModel'
import { RewardDetail } from '../../features/pasture/RewardDetail'
import { LockIcon, RewardIcon } from '../../features/pasture/RewardIcon'
import { itemName, requirementText } from '../../features/pasture/rewardText'

export interface PastureViewProps {
  view: PastureDto
  /** Desktop: the panel starts with the title (on phones it is a chip over the scene). */
  desktop: boolean
  onToggle(key: PastureKey, show: boolean): void
  onColor(color: BarnColor): void
  /** The last save failed (the view is back to what the server has). */
  saveFailed?: boolean
}

const MUTED = { fontSize: 12, fontWeight: 800, color: 'var(--c-muted-aa)' } as const
const LOCK_TAG = { background: '#F3EEDF', color: 'var(--c-muted-aa)' } as const

interface RewardRowProps {
  item: PastureItemDto
  onToggle: PastureViewProps['onToggle']
  onOpen(key: PastureKey): void
}

function RewardRow({ item, onToggle, onOpen }: RewardRowProps) {
  const { t } = useTranslation()
  const name = itemName(t, item.key)
  return (
    <li className={cx('unl', !item.unlocked && 'off')} data-item={item.key} data-unlocked={item.unlocked}>
      <button type="button" className="unl-open" aria-label={t('pasture.detail.open', { name })} onClick={() => onOpen(item.key)}>
        <span className="unl-ic">{item.unlocked ? <RewardIcon item={item.key} size={40} /> : <LockIcon />}</span>
        <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 15 }}>{name}</b>
          <span style={MUTED}>{requirementText(t, item)}</span>
        </span>
      </button>
      {item.unlocked ? (
        <Toggle on={item.shown} onChange={(v) => onToggle(item.key, v)} label={t('pasture.show', { name })} />
      ) : (
        <span className="tag" style={LOCK_TAG}>
          {t('pasture.locked')}
        </span>
      )}
    </li>
  )
}

function ColorCard({ view, onColor, onOpen }: Pick<PastureViewProps, 'view' | 'onColor'> & { onOpen(key: PastureKey): void }) {
  const { t } = useTranslation()
  const item = view.items.find((i) => i.key === 'barnColor')
  const open = item?.unlocked ?? false
  return (
    <section className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }} aria-label={t('pasture.barnColor')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <button type="button" className="unl-open" aria-label={t('pasture.detail.open', { name: t('pasture.barnColor') })} onClick={() => onOpen('barnColor')}>
          <b>{t('pasture.barnColor')}</b>
        </button>
        {open || !item ? null : (
          <span className="tag" style={LOCK_TAG}>
            {requirementText(t, { ...item, progress: undefined })}
          </span>
        )}
      </div>
      <div role="radiogroup" aria-label={t('pasture.barnColor')} style={{ display: 'flex', gap: 10 }}>
        {BARN_COLOR_KEYS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={view.barnColor === c}
            aria-label={t('pasture.colorAria', { color: t(`pasture.color.${c}`) })}
            className={cx('swatch', view.barnColor === c && 'on')}
            style={{ background: BARN_COLORS[c] }}
            disabled={!open}
            data-color={c}
            onClick={() => onColor(c)}
          />
        ))}
      </div>
    </section>
  )
}

/** Р6 / ПД1 „Твоето пасище“ (П1 / ПД2 once everything is unlocked): the rewards with their switches and the barn colour. */
export function PastureView({ view, desktop, onToggle, onColor, saveFailed = false }: PastureViewProps) {
  const { t } = useTranslation()
  const all = isAllUnlocked(view)
  const [open, setOpen] = useState<PastureKey | null>(null)
  const detail = open === null ? undefined : view.items.find((i) => i.key === open)
  const list = (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }} aria-label={t('pasture.rewards')}>
      {toggleItems(view).map((item) => (
        <RewardRow key={item.key} item={item} onToggle={onToggle} onOpen={setOpen} />
      ))}
    </ul>
  )
  return (
    <>
      {desktop ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>{t('pasture.title')}</h1>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-muted-aa)' }}>{t('pasture.level', { level: view.level })}</span>
        </div>
      ) : (
        <h1 className="sr-only">{t('pasture.title')}</h1>
      )}
      {saveFailed ? (
        <p role="alert" style={{ margin: 0, fontWeight: 800, color: '#B5452F' }}>
          {t('pasture.saveFailed')}
        </p>
      ) : null}
      {all ? (
        <>
          <b style={{ fontSize: 20 }}>{t('pasture.allTitle')}</b>
          <p style={{ margin: 0, fontWeight: 700, color: '#4A5640', lineHeight: 1.5 }}>
            {t('pasture.allText')} {t('pasture.allColor', { color: t(`pasture.colorIn.${view.barnColor}`) })}
          </p>
          <ColorCard view={view} onColor={onColor} onOpen={setOpen} />
          {list}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{t('pasture.rewards')}</h2>
            <span style={MUTED}>{t('pasture.count', { count: unlockedCount(view), total: PASTURE_KEYS.length })}</span>
          </div>
          {list}
          <ColorCard view={view} onColor={onColor} onOpen={setOpen} />
        </>
      )}
      {detail ? <RewardDetail item={detail} onToggle={(show) => onToggle(detail.key, show)} onClose={() => setOpen(null)} /> : null}
    </>
  )
}
