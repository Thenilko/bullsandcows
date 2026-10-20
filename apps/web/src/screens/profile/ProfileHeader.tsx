import { XP_PER_LEVEL } from '@bc/game-core'
import type { MeDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { BullIcon } from '../../components/ui'

const AVATAR = {
  width: 84,
  height: 84,
  borderRadius: '50%',
  background: '#F2C230',
  border: '4px solid #FFFFFF',
  boxShadow: '0 6px 16px rgba(30,40,20,.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

export function ProfileHeader({ me, desktop = false }: { me: MeDto; desktop?: boolean }) {
  const { t } = useTranslation()
  const width = Math.min(100, Math.round((me.xpIntoLevel / XP_PER_LEVEL) * 100))
  const avatar = desktop
    ? { ...AVATAR, width: 110, height: 110, border: '5px solid #FFFFFF', flex: 'none' }
    : AVATAR
  const info = (
    <>
      <h1
        style={{
          margin: 0,
          fontSize: desktop ? 32 : 24,
          fontWeight: 900,
          lineHeight: desktop ? 1 : undefined,
        }}
      >
        {me.profile.username}
      </h1>
      <span
        style={{
          fontWeight: desktop ? 900 : 800,
          color: '#8E3424',
          fontSize: desktop ? 17 : undefined,
        }}
      >
        {t('profile.levelLine', { title: t(`rank.${me.rankKey}`), level: me.level })}
      </span>
      <div
        role="progressbar"
        aria-label={t('profile.levelLine', { title: t(`rank.${me.rankKey}`), level: me.level })}
        aria-valuemin={0}
        aria-valuemax={XP_PER_LEVEL}
        aria-valuenow={me.xpIntoLevel}
        style={{
          width: desktop ? '100%' : '70%',
          maxWidth: desktop ? 420 : undefined,
          height: desktop ? 12 : 10,
          borderRadius: 6,
          background: '#ECE5D2',
          overflow: 'hidden',
          marginTop: 4,
        }}
      >
        <div
          className="hbar"
          style={{ height: '100%', width: `${width}%`, background: '#5E9E46', borderRadius: 6 }}
        />
      </div>
      <span style={{ fontSize: desktop ? 13 : 12, fontWeight: 700, color: '#5C6651' }}>
        {t('profile.xp', { xp: me.xpIntoLevel, level: me.level + 1 })}
      </span>
      <span style={{ fontSize: desktop ? 13 : 12, fontWeight: 700, color: '#5C6651' }}>
        {t('profile.rating', { rating: me.rating })}
      </span>
    </>
  )
  if (!desktop) {
    return (
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          marginTop: 14,
        }}
      >
        <span className="float" style={avatar}>
          <BullIcon size={60} ring />
        </span>
        {info}
      </header>
    )
  }
  return (
    <header
      className="card rise"
      style={{ padding: 28, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}
    >
      <span className="float" style={avatar}>
        <BullIcon size={78} ring />
      </span>
      <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {info}
      </div>
    </header>
  )
}
