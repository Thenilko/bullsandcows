import { rankKeyForLevel } from '@bc/game-core'
import type { PastureDto } from '@bc/protocol'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Shell } from '../app/layouts/Shell'
import { isAllUnlocked, togglePatch, toScenePasture } from '../features/pasture/pastureModel'
import { usePasture, useUpdatePasture } from '../features/pasture/usePasture'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { IDLE_SCENE } from './idleScene'
import { PastureView, type PastureViewProps } from './pasture/PastureView'

/** Artboard panel tops: Р6 (the list) and П1 (everything unlocked, a taller scene). */
const PANEL_TOP = 356
const PANEL_TOP_ALL = 516
const HUD = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } as const

function Chips({ view }: { view: PastureDto }) {
  const { t } = useTranslation()
  const level = isAllUnlocked(view)
    ? t('pasture.levelRank', { level: view.level, rank: t(`rank.${rankKeyForLevel(view.level)}`) })
    : t('pasture.level', { level: view.level })
  return (
    <div style={HUD}>
      <span className="ps-hud" style={{ fontSize: 15 }}>
        {t('pasture.title')}
      </span>
      <span className="ps-hud">{level}</span>
    </div>
  )
}

export type PastureScreenProps = Omit<PastureViewProps, 'desktop'>

/** The screen around the view: the scene shows the rewards as they are switched (the view, not the cache). */
export function PastureScreen(props: PastureScreenProps) {
  const desktop = useIsDesktop()
  const { view } = props
  const scene = useMemo(() => ({ ...IDLE_SCENE, pasture: toScenePasture(view) }), [view])
  return (
    <Shell
      scene={scene}
      screen="pasture"
      sceneTop={isAllUnlocked(view) ? PANEL_TOP_ALL : PANEL_TOP}
      hud={desktop ? undefined : <Chips view={view} />}
    >
      <PastureView {...props} desktop={desktop} />
    </Shell>
  )
}

/** `/profile/pasture`: Профил → „Твоето пасище“. */
export function Pasture() {
  const { t } = useTranslation()
  const query = usePasture()
  const update = useUpdatePasture()
  const view = query.data
  if (!view) {
    return (
      <Shell scene={IDLE_SCENE} screen="pasture" sceneTop={PANEL_TOP}>
        <p role={query.isError ? 'alert' : 'status'} style={{ fontWeight: 800, textAlign: 'center' }}>
          {query.isError ? t('pasture.loadFailed') : t('common.loading')}
        </p>
      </Shell>
    )
  }
  return (
    <PastureScreen
      view={view}
      saveFailed={update.isError}
      onToggle={(key, show) => update.mutate(togglePatch(view, key, show))}
      onColor={(barnColor) => update.mutate({ barnColor })}
    />
  )
}
