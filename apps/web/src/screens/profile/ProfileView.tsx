import type { BadgeKey, MeDto, SettingsPatch } from '@bc/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cta, Seg, Soft } from '../../components/ui'
import { UpgradeDialog } from '../../features/auth/UpgradeDialog'
import { badgeViews, type BadgeView } from '../../features/badges/badgeModel'
import { BadgeDetail } from '../../features/badges/BadgeDetail'
import { BadgesTab, type BadgesData } from '../../features/badges/BadgesTab'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { ProfileHeader } from './ProfileHeader'
import { SettingsCard } from './SettingsCard'
import { BucketChart, StatTiles } from './ProfileStats'

export type ProfileTab = 'profile' | 'badges'

export interface ProfileViewProps {
  me: MeDto
  badges: BadgesData
  /** Phones: which of the two tabs is open (the URL keeps it). */
  tab: ProfileTab
  onTab(tab: ProfileTab): void
  onPatch(patch: SettingsPatch): void
  onLogout(): void
  /** Opens with this badge's detail (dev gallery). */
  detailKey?: BadgeKey
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

/** The detail sheet state, seeded from `detailKey` for the gallery. */
function useDetail(badges: BadgesData, detailKey: BadgeKey | undefined): [BadgeView | null, (v: BadgeView | null) => void] {
  const [detail, setDetail] = useState<BadgeView | null>(() =>
    detailKey ? (badgeViews(badges.states).find((v) => v.key === detailKey) ?? null) : null,
  )
  return [detail, setDetail]
}

function DesktopProfile({ me, badges, onPatch, onLogout, detailKey }: ProfileViewProps) {
  const { t } = useTranslation()
  const [detail, setDetail] = useDetail(badges, detailKey)
  return (
    <section
      aria-label={t('profile.area')}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(300px, 1fr)',
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
        style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{t('profile.badges')}</h2>
        <BadgesTab badges={badges} guest={me.profile.isGuest} onOpen={setDetail} desktop />
      </section>
      {detail ? <BadgeDetail view={detail} onClose={() => setDetail(null)} /> : null}
    </section>
  )
}

function MobileProfile({ me, badges, tab, onTab, onPatch, onLogout, detailKey }: ProfileViewProps) {
  const { t } = useTranslation()
  const [detail, setDetail] = useDetail(badges, detailKey)
  const tabs = [
    { value: 'profile' as const, label: t('badges.profileTab') },
    { value: 'badges' as const, label: t('badges.tab') },
  ]
  return (
    <section aria-label={t('profile.area')} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
      <Seg value={tab} options={tabs} onChange={onTab} label={t('profile.area')} />
      {tab === 'badges' ? (
        <BadgesTab badges={badges} guest={me.profile.isGuest} onOpen={setDetail} />
      ) : (
        <>
          <div style={COLUMN}>
            <ProfileHeader me={me} />
            <StatTiles stats={me.stats} />
          </div>
          <div style={COLUMN}>
            <h2 style={H2}>{t('profile.yourGames')}</h2>
            <BucketChart buckets={me.buckets} />
            <h2 style={H2}>{t('settings.title')}</h2>
            <SettingsCard profile={me.profile} onPatch={onPatch} />
            {me.profile.isGuest ? <GuestUpgrade /> : null}
            <Soft onClick={onLogout}>{t('profile.logout')}</Soft>
          </div>
        </>
      )}
      {detail ? <BadgeDetail view={detail} onClose={() => setDetail(null)} /> : null}
    </section>
  )
}

/** The profile: two tabs on phones („Профил“ / „Значки“, Р2), the badges card in the right column on desktop. */
export function ProfileView(props: ProfileViewProps) {
  return useIsDesktop() ? <DesktopProfile {...props} /> : <MobileProfile {...props} />
}
