import type { MeDto, SettingsPatch } from '@bc/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cta, Soft } from '../../components/ui'
import { UpgradeDialog } from '../../features/auth/UpgradeDialog'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { BadgeGrid } from './BadgeGrid'
import { ProfileHeader } from './ProfileHeader'
import { SettingsCard } from './SettingsCard'
import { BucketChart, StatTiles } from './ProfileStats'

export interface ProfileViewProps {
  me: MeDto
  onPatch(patch: SettingsPatch): void
  onLogout(): void
}

const H2 = { margin: '4px 0 0', fontSize: 18, fontWeight: 900 } as const
const COLUMN = { display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 } as const

function GuestUpgrade() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (open) return <UpgradeDialog />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: 0, fontWeight: 700, color: '#4A5640' }}>{t('common.guestOnly')}</p>
      <Cta onClick={() => setOpen(true)}>{t('common.createProfile')}</Cta>
    </div>
  )
}

function DesktopProfile({ me, onPatch, onLogout }: ProfileViewProps) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('profile.area')}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, 1fr)',
        gap: 24,
        alignItems: 'start',
      }}
    >
      <div style={{ ...COLUMN, gap: 24 }}>
        <ProfileHeader me={me} desktop />
        <StatTiles stats={me.stats} desktop />
        <BucketChart buckets={me.buckets} desktop />
        <SettingsCard profile={me.profile} onPatch={onPatch} desktop />
        {me.profile.isGuest ? <GuestUpgrade /> : null}
        <Soft onClick={onLogout}>{t('profile.logout')}</Soft>
      </div>
      <section
        aria-label={t('profile.badges')}
        className="card"
        style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{t('profile.badges')}</h2>
        <BadgeGrid badges={me.badges} detailed />
      </section>
    </section>
  )
}

export function ProfileView(props: ProfileViewProps) {
  const { me, onPatch, onLogout } = props
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  if (desktop) return <DesktopProfile {...props} />
  return (
    <section
      aria-label={t('profile.area')}
      style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}
    >
      <div style={COLUMN}>
        <ProfileHeader me={me} />
        <StatTiles stats={me.stats} />
        <h2 style={H2}>{t('profile.badges')}</h2>
        <BadgeGrid badges={me.badges} />
      </div>
      <div style={COLUMN}>
        <h2 style={H2}>{t('profile.yourGames')}</h2>
        <BucketChart buckets={me.buckets} />
        <h2 style={H2}>{t('settings.title')}</h2>
        <SettingsCard profile={me.profile} onPatch={onPatch} />
        {me.profile.isGuest ? <GuestUpgrade /> : null}
        <Soft onClick={onLogout}>{t('profile.logout')}</Soft>
      </div>
    </section>
  )
}
