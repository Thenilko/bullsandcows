import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router'
import { Shell } from '../app/layouts/Shell'
import { useSession } from '../features/auth/session'
import { useIsMember } from '../features/farm/useFarm'
import { AwardHost } from '../features/weekly/AwardHost'
import { useStartWeekly, useWeekly } from '../features/weekly/useWeekly'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { useNow } from '../hooks/useNow'
import { myRankKey, mySpecies } from '../lib/rank'
import { sfx } from '../lib/sound'
import { farmErrorKey } from './Farm'
import { IDLE_SCENE } from './idleScene'
import { WeeklyView } from './weekly/WeeklyView'

/** Р7 on the 390×844 artboard: the 250px scene, the panel from 226. */
const PANEL_TOP = 226
const MINUTE_MS = 60_000

/** The weekly screens' frame: `sc-weekly` on desktop (the framed panel / the 640px column), chips on phones. */
export function WeeklyShell({ week, children }: { week?: number; children: ReactNode }) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const hud = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span className="ps-hud" style={{ fontSize: 15 }}>
        {t('weekly.hud.title')}
      </span>
      {week ? <span className="ps-hud">{t('weekly.hud.week', { week })}</span> : null}
    </div>
  )
  return (
    <Shell scene={IDLE_SCENE} screen="weekly" sceneTop={PANEL_TOP} hud={desktop ? undefined : hud}>
      {children}
    </Shell>
  )
}

/** `/weekly` — Р7 / ПД9: the week, your result, the leaders and „Играй предизвикателството“ (once a day). */
export function Weekly() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const member = useIsMember()
  const me = useSession((s) => s.me)
  const query = useWeekly()
  const start = useStartWeekly()
  const now = useNow(MINUTE_MS)
  if (!member) return <Navigate to="/new" replace />
  const week = query.data
  if (!week) {
    return (
      <WeeklyShell>
        <p role={query.isError ? 'alert' : 'status'} style={{ fontWeight: 800 }}>
          {query.isError ? t('weekly.loadFailed') : t('common.loading')}
        </p>
      </WeeklyShell>
    )
  }
  return (
    <WeeklyShell week={week.week}>
      <WeeklyView
        week={week}
        now={now}
        username={me?.profile.username ?? ''}
        self={{
          level: me?.level ?? 1,
          rankKey: myRankKey(me),
          avatarSpecies: mySpecies(me),
          goldFrame: me?.goldFrame === true,
        }}
        busy={start.isPending}
        error={start.isError ? t(farmErrorKey(start.error)) : null}
        onPlay={() => {
          sfx.play('tap')
          start.mutate(undefined, { onSuccess: () => void navigate('/weekly/play') })
        }}
      />
      <AwardHost week={week} />
    </WeeklyShell>
  )
}
