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

export function ProfileView({ me, onPatch, onLogout }: ProfileViewProps) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  return (
    <section
      aria-label={t('profile.area')}
      style={{
        display: 'grid',
        gridTemplateColumns: desktop ? 'repeat(2, minmax(0, 1fr))' : '1fr',
        gap: 14,
      }}
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
