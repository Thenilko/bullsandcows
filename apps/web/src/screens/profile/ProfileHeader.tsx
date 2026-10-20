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

export function ProfileHeader({ me }: { me: MeDto }) {
  const { t } = useTranslation()
  const width = Math.min(100, Math.round((me.xpIntoLevel / XP_PER_LEVEL) * 100))
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
      <span className="float" style={AVATAR}>
        <BullIcon size={60} ring />
      </span>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{me.profile.username}</h1>
      <span style={{ fontWeight: 800, color: '#8E3424' }}>
        {t('profile.levelLine', { title: t(`rank.${me.rankKey}`), level: me.level })}
      </span>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={XP_PER_LEVEL}
        aria-valuenow={me.xpIntoLevel}
        style={{
          width: '70%',
          height: 10,
          borderRadius: 5,
          background: '#ECE5D2',
          overflow: 'hidden',
          marginTop: 4,
        }}
      >
        <div
          className="hbar"
          style={{ height: '100%', width: `${width}%`, background: '#5E9E46', borderRadius: 5 }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7560' }}>
        {t('profile.xp', { xp: me.xpIntoLevel, level: me.level + 1 })}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7560' }}>
        {t('profile.rating', { rating: me.rating })}
      </span>
    </header>
  )
}
