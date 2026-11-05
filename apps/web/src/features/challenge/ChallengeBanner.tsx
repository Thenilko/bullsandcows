import type { ChallengeDto, IncomingChallengesDto } from '@bc/protocol'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { cx } from '../../components/ui/cx'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { challengeApi, INBOX_KEY } from './api'
import styles from './banner.module.css'

export interface ChallengeBannerProps {
  challenge: ChallengeDto
  onGone(id: string): void
}

/** Marks the challenge answered „След играта“ in the cached inbox, so the banner goes at once. */
const markLater = (data: IncomingChallengesDto | undefined, id: string) =>
  data && {
    challenges: data.challenges.map((c) => (c.id === id ? { ...c, later: true } : c)),
  }

/**
 * A challenge that comes during a game, a duel or matchmaking: one slim strip at the top that never covers
 * the board or the keypad. „След играта“ keeps it open until the game is over (then the full card shows);
 * „Откажи“ declines it. Neither leaves the game.
 */
export function ChallengeBanner({ challenge, onGone }: ChallengeBannerProps) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const qc = useQueryClient()
  const later = useMutation({
    mutationFn: () => challengeApi.later(challenge.id),
    onSuccess: () =>
      qc.setQueryData<IncomingChallengesDto>(INBOX_KEY, (d) => markLater(d, challenge.id)),
    // Answered, cancelled or expired meanwhile: nothing left to wait for.
    onError: () => onGone(challenge.id),
  })
  const decline = useMutation({
    mutationFn: () => challengeApi.decline(challenge.id),
    onSettled: () => onGone(challenge.id),
  })
  const pending = later.isPending || decline.isPending
  const title = t('challenge.inbox.title', { name: challenge.from.username })
  return (
    <aside
      aria-label={t('challenge.inbox.area')}
      className={cx(styles.banner, desktop && styles.desktop)}
    >
      <p className={styles.text}>{title}</p>
      <button
        type="button"
        className={cx(styles.button, styles.later)}
        disabled={pending}
        onClick={() => later.mutate()}
      >
        {t('challenge.inbox.later')}
      </button>
      <button
        type="button"
        className={styles.button}
        disabled={pending}
        onClick={() => decline.mutate()}
      >
        {t('challenge.inbox.decline')}
      </button>
    </aside>
  )
}
