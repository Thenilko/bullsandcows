import type { GuessEntryDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { BullIcon, CowIcon } from '../../components/ui'
import { cx } from '../../components/ui/cx'

// Styles are classes (pasishte.css `.hrow-*`) so the narrow desktop sheet can tighten them; the badge may wrap
// inside the row but is never clipped.

/** Attempts, newest first; the latest row plays the entrance animation. */
export function History({ guesses }: { guesses: readonly GuessEntryDto[] }) {
  const { t } = useTranslation()
  if (guesses.length === 0) return <p className="cmp-hide" style={{ margin: 0, color: 'var(--c-muted-aa)', fontWeight: 700 }}>{t('notebook.noGuesses')}</p>
  const rows = guesses.map((g, i) => ({ g, n: i + 1 })).reverse()
  return (
    <ol aria-label={t('notebook.attempts')} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(({ g, n }) => (
        <li key={g.guess} className={cx('hrow', n === guesses.length && 'new')}>
          <span className="hrow-n">{n}</span>
          <span className="hrow-g">{g.guess}</span>
          <span className="hrow-c hrow-b" aria-label={t('common.bull', { count: g.bulls })}>
            <BullIcon size={22} />
            {g.bulls}
          </span>
          <span className="hrow-c" aria-label={t('common.cow', { count: g.cows })}>
            <CowIcon size={22} />
            {g.cows}
          </span>
          <span className="hrow-v">
            {t('common.variantsShort', { count: g.left })}
          </span>
          {g.consistent ? null : (
            <span title={t('notebook.wastedTip')} className="hrow-w">
              {t('notebook.wasted')}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}
