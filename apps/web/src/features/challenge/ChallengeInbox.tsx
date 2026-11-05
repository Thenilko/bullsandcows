import type { ChallengeDto } from '@bc/protocol'
import { rankKeyForLevel } from '@bc/game-core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Cta, RankAvatar, Soft } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { useNow } from '../../hooks/useNow'
import { ApiError } from '../../lib/api'
import { sfx } from '../../lib/sound'
import { fmtClock } from '../../screens/duel/duelUtils'
import { useSession } from '../auth/session'
import { roomPath } from '../duel/api'
import { activityOf } from '../presence/presence'
import { challengeApi } from './api'
import styles from './inbox.module.css'

/** How often a member's open tab asks for new challenges. */
export const INBOX_POLL_MS = 10_000
export const INBOX_KEY = ['challenges', 'incoming'] as const
/** No interruptions while a game or a duel is on, or while matchmaking. */
const BUSY: readonly string[] = ['play', 'duel', 'queue']

interface RouterLike {
  readonly state: { readonly location: { readonly pathname: string } }
  subscribe(fn: () => void): () => void
  navigate(to: string): unknown
}

function useVisible(): boolean {
  return useSyncExternalStore(
    (fn) => {
      document.addEventListener('visibilitychange', fn)
      return () => document.removeEventListener('visibilitychange', fn)
    },
    () => document.visibilityState === 'visible',
  )
}

function usePathname(router: RouterLike): string {
  return useSyncExternalStore(
    (fn) => router.subscribe(fn),
    () => router.state.location.pathname,
  )
}

/** Signed in with a profile (guests cannot be challenged). */
const useIsMember = () =>
  useSession(
    (s) => s.session !== null && s.session.user.isGuest !== true && s.me?.profile.isGuest !== true,
  )

/** Rings once for every challenge id not seen before in this tab. */
function useChime(list: readonly ChallengeDto[]) {
  const seen = useRef(new Set<string>())
  useEffect(() => {
    const fresh = list.filter((c) => !seen.current.has(c.id))
    for (const c of fresh) seen.current.add(c.id)
    if (fresh.length > 0) sfx.play('bell')
  }, [list])
}

/**
 * „{{name}} те предизвика на дуел“: polls `GET /api/challenges/incoming` while a member's tab is visible and
 * nothing is being played, and shows the newest one with a countdown, „Приеми“ and „Откажи“. Mounted once,
 * outside the router (like the other hosts), so it navigates through `router`.
 */
export function ChallengeInbox({ router }: { router: RouterLike }) {
  const member = useIsMember()
  const visible = useVisible()
  const busy = BUSY.includes(activityOf(usePathname(router)))
  const active = member && visible && !busy
  const query = useQuery({
    queryKey: INBOX_KEY,
    queryFn: () => challengeApi.incoming(),
    enabled: active,
    refetchInterval: active ? INBOX_POLL_MS : false,
    retry: false,
  })
  const now = useNow(1000, active)
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set())
  const list = (query.data?.challenges ?? []).filter((c) => !gone.has(c.id) && c.expiresAt > now)
  useChime(active ? list : [])
  const current = list[0]
  if (!active || !current) return null
  const dismiss = (id: string) => setGone((prev) => new Set([...prev, id]))
  return (
    <ChallengeCard
      key={current.id}
      challenge={current}
      now={now}
      onGone={dismiss}
      onRoom={(path) => void router.navigate(path)}
    />
  )
}

export interface ChallengeCardProps {
  challenge: ChallengeDto
  now: number
  onGone(id: string): void
  onRoom(path: string): void
}

/** The pinned card of one incoming challenge. */
export function ChallengeCard({ challenge, now, onGone, onRoom }: ChallengeCardProps) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const qc = useQueryClient()
  const { from, settings } = challenge
  const accept = useMutation({
    mutationFn: () => challengeApi.accept(challenge.id),
    onSuccess: ({ roomId, token }) => {
      onGone(challenge.id)
      onRoom(roomPath(roomId, token))
    },
    onError: () => void qc.invalidateQueries({ queryKey: INBOX_KEY }),
  })
  const decline = useMutation({
    mutationFn: () => challengeApi.decline(challenge.id),
    onSettled: () => onGone(challenge.id),
  })
  const error =
    accept.error instanceof ApiError
      ? t(`error.${accept.error.code}`, { count: settings.len })
      : accept.error
        ? t('error.unknown')
        : null
  const title = t('challenge.inbox.title', { name: from.username })
  const chips = [
    t(`newGame.format.${settings.format}.name`),
    t('common.digits', { count: settings.len }),
    t(settings.zero ? 'newGame.chip.zero' : 'newGame.chip.noZero'),
  ]
  const pending = accept.isPending || decline.isPending
  return (
    <aside
      role="alertdialog"
      aria-label={t('challenge.inbox.area')}
      aria-describedby={`challenge-${challenge.id}`}
      className={cx(styles.card, desktop && styles.desktop)}
    >
      <div className={styles.head}>
        <RankAvatar species={from.avatarSpecies} rankKey={rankKeyForLevel(from.level)} size={46} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <p id={`challenge-${challenge.id}`} className={styles.title}>
            {title}
          </p>
          <span className={styles.clock}>
            {t('challenge.inbox.expires', { time: fmtClock(challenge.expiresAt - now) })}
          </span>
        </div>
      </div>
      <div className={styles.chips}>
        {chips.map((label) => (
          <span key={label} className={cx('tag', styles.chip)}>
            {label}
          </span>
        ))}
      </div>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Soft small disabled={pending} onClick={() => decline.mutate()}>
          {t('challenge.inbox.decline')}
        </Soft>
        <Cta small disabled={pending} onClick={() => accept.mutate()}>
          {t('challenge.inbox.accept')}
        </Cta>
      </div>
    </aside>
  )
}
