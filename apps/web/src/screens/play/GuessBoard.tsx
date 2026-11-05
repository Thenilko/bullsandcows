import { useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { BullIcon, CowIcon } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { Bubble } from '../../features/coach/Bubble'
import { useCoach, useDueTip } from '../../features/coach/store'
import { useNotesSheet } from '../../features/notebook/sheet'
import { sfx } from '../../lib/sound'
import styles from './GuessBoard.module.css'

/** One attempt on the board; `consistent: false` marks a wasted move („излишен“). */
export interface BoardGuess {
  guess: string
  bulls: number
  cows: number
  consistent?: boolean
}

/** A second list on the board (a classic duel: the opponent's attempts against my number). */
export interface BoardSection {
  label: string
  guesses: readonly BoardGuess[]
  /** Shown instead of the rows while the list is empty. */
  empty: string
}

/** The painted rows, newest on top; the newest plays the entrance animation. */
function BoardRows({ guesses, label }: { guesses: readonly BoardGuess[]; label?: string }) {
  const { t } = useTranslation()
  const rows = guesses.map((g, i) => ({ g, n: i + 1 })).reverse()
  return (
    <ol className={styles.list} aria-label={label}>
      {rows.map(({ g, n }) => (
        <li
          key={`${g.guess}-${n}`}
          className={cx(styles.row, n === guesses.length && styles.latest)}
        >
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
          {g.consistent === false ? (
            <span
              className={styles.wastedMark}
              title={t('notebook.wastedTip')}
              aria-label={t('notebook.wasted')}
            >
              !
            </span>
          ) : (
            <span />
          )}
        </li>
      ))}
    </ol>
  )
}

/** A section heading and its rows (or the empty note). */
function Section({ section }: { section: BoardSection }) {
  return (
    <>
      <h3 className={styles.sub}>{section.label}</h3>
      {section.guesses.length > 0 ? (
        <BoardRows guesses={section.guesses} label={section.label} />
      ) : (
        <p className={styles.empty}>{section.empty}</p>
      )}
    </>
  )
}

/**
 * Phones: a wooden board over the pasture with every attempt, newest on top, so the history never hides behind
 * the notebook button. Tapping it opens the notebook. Nothing before the first guess (of either player); a
 * classic duel adds the opponent's attempts under mine (`opp`).
 */
export function GuessBoard({
  guesses,
  started,
  opp,
}: {
  guesses: readonly BoardGuess[]
  started: boolean
  opp?: BoardSection
}) {
  const { t } = useTranslation()
  const show = useNotesSheet((s) => s.show)
  const ref = useRef<HTMLElement>(null)
  const tip = useDueTip(started, guesses.length)
  const dismiss = useCoach((s) => s.dismiss)
  const oppCount = opp?.guesses.length ?? 0
  if (guesses.length === 0 && oppCount === 0) return null
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
      <div className={styles.rows} onClick={open}>
        {guesses.length > 0 ? <BoardRows guesses={guesses} /> : null}
        {opp ? <Section section={opp} /> : null}
      </div>
      <button type="button" className={styles.open} onClick={open}>
        {t('play.board.open')}
      </button>
      {tip === 'board' && guesses.length > 0 ? (
        <Bubble anchor={ref} side="below" onDismiss={() => dismiss('board')} testId="coach-board">
          <Trans i18nKey="coach.board" components={{ b: <strong /> }} />
        </Bubble>
      ) : null}
    </section>
  )
}

/** Desktop, classic duel: the same plank with the opponent's attempts, above the opponent strip. */
export function OppBoard({ section }: { section: BoardSection }) {
  return (
    <section
      className={cx(styles.board, styles.side)}
      aria-label={section.label}
      data-testid="opp-board"
    >
      <div className={styles.rows}>
        <Section section={section} />
      </div>
    </section>
  )
}
