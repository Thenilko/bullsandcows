import type { PublicState } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui'
import { GuessChips, type ChipGuess } from './GuessChips'

/** Classic: what the opponent has tried against my secret. */
export function OppGuessesCard({ state, oppName, mySecret }: { state: PublicState; oppName: string; mySecret: string }) {
  const { t } = useTranslation()
  const shown: ChipGuess[] = (state.opp?.guesses ?? []).flatMap((g) => (g.guess === null ? [] : [{ guess: g.guess, bulls: g.bulls ?? 0, cows: g.cows ?? 0 }]))
  return (
    <Card style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontWeight: 900, fontSize: 14 }}>{t('duel.play.oppVs', { name: oppName, secret: mySecret })}</span>
      {shown.length > 0 ? (
        <GuessChips guesses={shown} label={oppName} />
      ) : (
        <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7560' }}>{t('duel.play.noOppGuesses')}</span>
      )}
    </Card>
  )
}
