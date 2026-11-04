import type { GuessEntryDto } from '@bc/protocol'
import { useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { BullIcon, CowIcon } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { Bubble } from '../../features/coach/Bubble'
import { useCoach, useDueTip } from '../../features/coach/store'
import { useNotesSheet } from '../../features/notebook/sheet'
import { sfx } from '../../lib/sound'
import styles from './GuessBoard.module.css'

/**
 * Phones: a wooden board over the pasture with every attempt, newest on top, so the history never hides behind
 * the notebook button. Tapping it opens the notebook. Nothing before the first guess.
 */
export function GuessBoard({
  guesses,
  started,
}: {
  guesses: readonly GuessEntryDto[]
  started: boolean
}) {
  const { t } = useTranslation()
  const show = useNotesSheet((s) => s.show)
  const ref = useRef<HTMLElement>(null)
  const tip = useDueTip(started, guesses.length)
  const dismiss = useCoach((s) => s.dismiss)
  if (guesses.length === 0) return null
  const rows = guesses.map((g, i) => ({ g, n: i + 1 })).reverse()
  const open = () => {
    sfx.play('page')
    show()
  }
  return (
    <section
      ref={ref}
      className={styles.board}
      aria-label={t('play.board.aria')}
      data-testid="guess-board"
    >
      <ol className={styles.rows} onClick={open}>
        {rows.map(({ g, n }) => (
          <li key={g.guess} className={cx(styles.row, n === guesses.length && styles.latest)}>
            <span className={styles.n}>{n}</span>
            <span className={styles.guess}>{g.guess}</span>
            <span className={styles.count} aria-label={t('common.bull', { count: g.bulls })}>
              <BullIcon size={18} />
              {g.bulls}
            </span>
            <span className={styles.count} aria-label={t('common.cow', { count: g.cows })}>
              <CowIcon size={18} />
              {g.cows}
            </span>
            {g.consistent ? (
              <span />
            ) : (
              <span
                className={styles.wastedMark}
                title={t('notebook.wastedTip')}
                aria-label={t('notebook.wasted')}
              >
                !
              </span>
            )}
          </li>
        ))}
      </ol>
      <button type="button" className={styles.open} onClick={open}>
        {t('play.board.open')}
      </button>
      {tip === 'board' ? (
        <Bubble anchor={ref} side="below" onDismiss={() => dismiss('board')} testId="coach-board">
          <Trans i18nKey="coach.board" components={{ b: <strong /> }} />
        </Bubble>
      ) : null}
    </section>
  )
}
