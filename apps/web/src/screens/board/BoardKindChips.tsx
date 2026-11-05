import { BOARD_KINDS, type BoardKind } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import styles from './kinds.module.css'

/** „Точки“ is the original board (`GET /api/leaderboard`); the rest are `GET /api/leaderboard/:kind`. */
export type BoardChoice = 'points' | BoardKind

export const BOARD_CHOICES: readonly BoardChoice[] = ['points', ...BOARD_KINDS]

/** `?kind=` from the URL; anything unknown is „Точки“. */
export function parseBoardChoice(raw: string | null): BoardChoice {
  return BOARD_CHOICES.find((k) => k === raw) ?? 'points'
}

export interface BoardKindChipsProps {
  value: BoardChoice
  onChange(next: BoardChoice): void
}

/** Точки · Дуели · Серии · Пастири · Игри · Приятели at the top of /board; one line, scrolls on phones. */
export function BoardKindChips({ value, onChange }: BoardKindChipsProps) {
  const { t } = useTranslation()
  return (
    <ul className={styles.row} aria-label={t('board.kind.aria')} data-testid="board-kinds">
      {BOARD_CHOICES.map((k) => (
        <li key={k}>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={k === value}
            onClick={() => {
              if (k !== value) onChange(k)
            }}
          >
            {t(`board.kind.${k}`)}
          </button>
        </li>
      ))}
    </ul>
  )
}
