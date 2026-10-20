import { useTranslation } from 'react-i18next'
import { Shell } from '../app/layouts/Shell'
import { useAuth } from '../features/auth/useAuth'
import { useMe } from '../features/stats/useMe'
import { useUpdateSettings } from '../features/stats/useUpdateSettings'
import { IDLE_SCENE } from './idleScene'
import { ProfileView } from './profile/ProfileView'

export function Profile() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const me = useMe()
  const update = useUpdateSettings()
  return (
    <Shell scene={IDLE_SCENE} sceneSide>
      {me.data ? (
        <ProfileView me={me.data} onPatch={(patch) => update.mutate(patch)} onLogout={logout} />
      ) : (
        <p role={me.isError ? 'alert' : 'status'} style={{ fontWeight: 800, textAlign: 'center' }}>
          {me.isError ? t('error.unknown') : t('common.loading')}
        </p>
      )}
    </Shell>
  )
}
