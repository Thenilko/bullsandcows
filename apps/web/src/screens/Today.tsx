import { dailyNumber, type Len } from '@bc/game-core'
import type { NudgeDto } from '@bc/protocol'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Shell } from '../app/layouts/Shell'
import { Cta, Sign } from '../components/ui'
import { useSession } from '../features/auth/session'
import { NudgeCard } from '../features/farm/NudgeBanner'
import { ReminderCard } from '../features/farm/ReminderCard'
import { useDismissNudge, useMyNudge } from '../features/farm/useFarm'
import { createGame } from '../features/solo/api'
import { ME_KEY } from '../features/stats/useMe'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { sfx } from '../lib/sound'
import { farmErrorKey } from './Farm'
import { IDLE_SCENE } from './idleScene'

/** П4 on the 390×844 artboard: the 380px scene, the panel from 300. */
const PANEL_TOP = 300

export interface TodayViewProps {
  number: number
  len: Len
  nudge: NudgeDto | null
  onDismiss(): void
  onPlay(): void
  busy: boolean
  error?: string | null
  /** The reminder card (a slot, so the gallery can show it without a session). */
  reminder: ReactNode
}

/** П4 / ПД8: the nudge banner, today's number with „Играй сега“ and the daily reminder. */
export function TodayView({ number, len, nudge, onDismiss, onPlay, busy, error, reminder }: TodayViewProps) {
  const { t } = useTranslation()
  return (
    <>
      {nudge ? <NudgeCard nudge={nudge} onClose={onDismiss} /> : null}
      <section className="card" aria-labelledby="today-title" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 id="today-title" style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
            {t('farm.today.title', { number })}
          </h1>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--c-muted-aa)' }}>{t('common.digits', { count: len })}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }} aria-hidden="true">
          {Array.from({ length: len }, (_, i) => (
            <Sign key={i}>?</Sign>
          ))}
        </div>
        {error ? (
          <p role="alert" style={{ margin: 0, fontWeight: 800, fontSize: 13, color: '#8A1F0B' }}>
            {error}
          </p>
        ) : null}
        <Cta style={{ minHeight: 54 }} disabled={busy} onClick={onPlay}>
          {t('farm.today.play')}
        </Cta>
      </section>
      {reminder}
    </>
  )
}

/** The frame: chips over the 380px scene on phones, the hanging board (ropes, one swing) on desktop. */
export function TodayShell({ number, children }: { number: number; children: ReactNode }) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const hud = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span className="ps-hud" style={{ fontSize: 15 }}>
        {t('farm.today.hud')}
      </span>
      <span className="ps-hud">#{number}</span>
    </div>
  )
  return (
    <Shell scene={IDLE_SCENE} screen="today" sceneTop={PANEL_TOP} hud={desktop ? undefined : hud}>
      {desktop ? (
        <div className="dk-play">
          <span className="dk-rope dk-rope-l" aria-hidden="true" />
          <span className="dk-rope dk-rope-r" aria-hidden="true" />
          <section className="dk-game dk-today">{children}</section>
        </div>
      ) : (
        children
      )}
    </Shell>
  )
}

/** `/today` — „Игра“ with an unread nudge: Home sends the player here before a new game. */
export function Today() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const len = useSession((s) => s.me?.profile.defaultLen ?? 4)
  const nudge = useMyNudge().data ?? null
  const dismiss = useDismissNudge()
  const number = dailyNumber(new Date())
  const play = useMutation({
    mutationFn: () => createGame({ len, zero: false, kind: 'daily' }),
    onSuccess: (game) => {
      void qc.invalidateQueries({ queryKey: ME_KEY })
      void navigate(`/play/${game.id}`)
    },
  })
  return (
    <TodayShell number={number}>
      <TodayView
        number={number}
        len={len}
        nudge={nudge}
        onDismiss={() => dismiss.mutate()}
        busy={play.isPending}
        error={play.isError ? t(farmErrorKey(play.error)) : null}
        onPlay={() => {
          sfx.play('tap')
          play.mutate()
        }}
        reminder={<ReminderCard />}
      />
    </TodayShell>
  )
}
