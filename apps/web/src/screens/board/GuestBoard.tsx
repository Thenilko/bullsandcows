import type { PhantomPlaceDto } from '@bc/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cta } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { PioneerLine } from '../../features/auth/PioneerLine'
import { UpgradeDialog } from '../../features/auth/UpgradeDialog'
import styles from './guest.module.css'

const CELL = { fontWeight: 700, color: '#4A5640', textAlign: 'right', fontSize: 13 } as const

/** The guest's „would be“ row: dashed, „Ти (гост)“, at the place their best game would take. */
export function PhantomRow({
  phantom,
  wide,
  columns,
}: {
  phantom: PhantomPlaceDto
  wide: boolean
  columns?: string
}) {
  const { t } = useTranslation()
  return (
    <li
      className={cx('lbrow', styles.phantom)}
      data-testid="phantom-row"
      style={wide ? { gridTemplateColumns: columns, gap: 10 } : undefined}
    >
      <span className={styles.phantomRank}>{phantom.rank}</span>
      <span className={styles.ghost} aria-hidden="true">
        ?
      </span>
      <span className={styles.phantomName}>{t('board.phantomName')}</span>
      <span style={CELL}>
        {wide ? phantom.attempts : t('common.attemptsShort', { count: phantom.attempts })}
      </span>
      {wide ? <span style={CELL}>—</span> : null}
      <span style={{ fontWeight: 900, textAlign: 'right' }}>{phantom.score}</span>
    </li>
  )
}

/**
 * „Щеше да си №N — направи си профил и мястото остава твое“, sticky under the board on a phone (the aside on
 * a desktop); without a phantom place, the plain invitation. The form opens in place.
 */
export function GuestPlaceCard({
  phantom,
  aside = false,
}: {
  phantom: PhantomPlaceDto | null | undefined
  aside?: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <aside
      className={cx(styles.card, 'rise')}
      data-aside={aside}
      aria-label={t('board.yourPlace')}
      data-testid="guest-place"
    >
      {phantom ? (
        <p className={styles.headline}>{t('board.phantomCard', { rank: phantom.rank })}</p>
      ) : (
        <p className={styles.note}>{t('board.phantomNone')}</p>
      )}
      {open ? (
        <UpgradeDialog />
      ) : (
        <>
          <PioneerLine />
          <Cta small onClick={() => setOpen(true)}>
            {t('common.createProfile')}
          </Cta>
        </>
      )}
    </aside>
  )
}
