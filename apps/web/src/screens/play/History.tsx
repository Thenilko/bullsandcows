import type { GuessEntryDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { BullIcon, CowIcon } from '../../components/ui'
import { cx } from '../../components/ui/cx'

const WASTED_STYLE = { fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: '#F9D7C8', color: '#8A1F0B' } as const
const COUNT_STYLE = { display: 'flex', alignItems: 'center', gap: 2, fontWeight: 900 } as const

/** Attempts, newest first; the latest row plays the entrance animation. */
export function History({ guesses }: { guesses: readonly GuessEntryDto[] }) {
  const { t } = useTranslation()
  if (guesses.length === 0) return <p className="cmp-hide" style={{ margin: 0, color: 'var(--c-muted-aa)', fontWeight: 700 }}>{t('notebook.noGuesses')}</p>
  const rows = guesses.map((g, i) => ({ g, n: i + 1 })).reverse()
  return (
    <ol aria-label={t('notebook.attempts')} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(({ g, n }) => (
        <li key={g.guess} className={cx('hrow', n === guesses.length && 'new')}>
          <span style={{ width: 22, fontWeight: 900, color: 'var(--c-muted-aa)' }}>{n}</span>
          <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '.14em' }}>{g.guess}</span>
          <span style={{ ...COUNT_STYLE, marginLeft: 'auto' }} aria-label={t('common.bull', { count: g.bulls })}>
            <BullIcon size={22} />
            {g.bulls}
          </span>
          <span style={COUNT_STYLE} aria-label={t('common.cow', { count: g.cows })}>
            <CowIcon size={22} />
            {g.cows}
          </span>
          <span style={{ minWidth: 54, textAlign: 'right', fontSize: 12, fontWeight: 800, color: 'var(--c-muted-aa)' }}>
            {t('common.variantsShort', { count: g.left })}
          </span>
          {g.consistent ? null : (
            <span title={t('notebook.wastedTip')} style={WASTED_STYLE}>
              {t('notebook.wasted')}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}
