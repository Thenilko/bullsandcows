import { useTranslation } from 'react-i18next'
import { Chip } from '../../../components/ui'

export interface ChipGuess {
  guess: string
  bulls: number
  cows: number
  /** False = the guess could not be the secret given earlier answers (a wasted move). */
  consistent?: boolean
}

const NUM = { color: '#8E3424' } as const
const COW = { color: '#4A5640' } as const
// Wasted move: dim the chip surface, not the text (opacity on the text failed AA at ~3:1).
const WASTED = { background: 'rgba(255, 255, 255, 0.6)', borderColor: 'rgba(220, 212, 191, 0.6)' } as const

/** Newest-first row of guess chips; the newest one animates in. */
export function GuessChips({ guesses, label }: { guesses: readonly ChipGuess[]; label: string }) {
  const { t } = useTranslation()
  const last = guesses.length - 1
  return (
    <div role="group" tabIndex={0} style={{ display: 'flex', gap: 6, overflowX: 'auto', minHeight: 36 }} aria-label={label}>
      {guesses
        .map((g, i) => ({ g, i }))
        .reverse()
        .map(({ g, i }) => (
          <Chip key={`${g.guess}-${i}`} fresh={i === last} style={g.consistent === false ? WASTED : undefined} title={g.consistent === false ? t('common.wasted', { count: 1 }) : undefined}>
            <span>{g.guess}</span>
            <span style={NUM}>{t('duel.play.chip.bulls', { count: g.bulls })}</span>
            <span style={COW}>{t('duel.play.chip.cows', { count: g.cows })}</span>
            {g.consistent === false ? <span aria-label={t('common.wasted', { count: 1 })}>{'×'}</span> : null}
          </Chip>
        ))}
    </div>
  )
}
