import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router'
import { farmLink } from '../features/farm/invite'
import { useFarmSettings, useIsMember, useMyFarm } from '../features/farm/useFarm'
import { sfx } from '../lib/sound'
import { FarmShell, farmErrorKey } from './Farm'
import { FarmSettingsView } from './farm/FarmSettingsView'

function Chip({ text }: { text: string }) {
  return (
    <span className="ps-hud" style={{ fontSize: 15 }}>
      {text}
    </span>
  )
}

/** `/farm/settings` (П5 / ПД7): the owner renames, changes the code, removes members; anyone can leave. */
export function FarmSettings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const member = useIsMember()
  const query = useMyFarm()
  const { rename, rotate, remove, leave } = useFarmSettings()
  const farm = query.data
  const gone = farm === null

  useEffect(() => {
    if (leave.isSuccess) void navigate('/farm', { replace: true })
  }, [leave.isSuccess, navigate])

  if (!member || gone) return <Navigate to="/farm" replace />
  const hud = <Chip text={t('farm.settings.title')} />
  if (!farm) {
    return (
      <FarmShell hud={hud}>
        <p role={query.isError ? 'alert' : 'status'} style={{ fontWeight: 800 }}>
          {query.isError ? t('farm.loadFailed') : t('common.loading')}
        </p>
      </FarmShell>
    )
  }
  const failed = [rename, rotate, remove, leave].find((m) => m.isError)
  const busy = [rename, rotate, remove, leave].some((m) => m.isPending)
  return (
    <FarmShell hud={hud}>
      <FarmSettingsView
        farm={farm}
        link={farmLink(farm.code)}
        busy={busy}
        error={failed ? t(farmErrorKey(failed.error)) : null}
        onRename={(name) => rename.mutate(name)}
        onNewCode={() => {
          sfx.play('tap')
          rotate.mutate()
        }}
        onRemove={(id) => remove.mutate(id)}
        onLeave={() => leave.mutate()}
      />
      <button type="button" className="soft sm" style={{ alignSelf: 'center' }} onClick={() => void navigate('/farm')}>
        {t('farm.settings.back')}
      </button>
    </FarmShell>
  )
}
