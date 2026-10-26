import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { Shell } from '../app/layouts/Shell'
import { useAuth } from '../features/auth/useAuth'
import { useBadges } from '../features/stats/useBadges'
import { useMe } from '../features/stats/useMe'
import { useUpdateSettings } from '../features/stats/useUpdateSettings'
import { IDLE_SCENE } from './idleScene'
import { ProfileView, type ProfileTab } from './profile/ProfileView'

const TAB_PARAM = 'tab'

/** The phone tab lives in the URL (`?tab=badges`), so it survives a reload and can be linked. */
function useProfileTab(): [ProfileTab, (tab: ProfileTab) => void] {
  const [params, setParams] = useSearchParams()
  const tab: ProfileTab = params.get(TAB_PARAM) === 'badges' ? 'badges' : 'profile'
  const setTab = (next: ProfileTab) => setParams(next === 'badges' ? { [TAB_PARAM]: 'badges' } : {}, { replace: true })
  return [tab, setTab]
}

export function Profile() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const me = useMe()
  const badges = useBadges(me.data !== undefined)
  const update = useUpdateSettings()
  const [tab, setTab] = useProfileTab()
  const navigate = useNavigate()
  return (
    <Shell scene={IDLE_SCENE} screen="profile">
      {me.data ? (
        <ProfileView
          me={me.data}
          badges={{ states: badges.data, loading: badges.isPending, error: badges.isError }}
          tab={tab}
          onTab={setTab}
          onPatch={(patch) => update.mutate(patch)}
          onLogout={logout}
          onPasture={() => void navigate('/profile/pasture')}
        />
      ) : (
        <p role={me.isError ? 'alert' : 'status'} style={{ fontWeight: 800, textAlign: 'center' }}>
          {me.isError ? t('error.unknown') : t('common.loading')}
        </p>
      )}
    </Shell>
  )
}
