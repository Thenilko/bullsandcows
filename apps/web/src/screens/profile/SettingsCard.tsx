import type { AvatarSpecies, ProfileDto, SettingsPatch } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Card, LangSwitch, Seg, Toggle } from '../../components/ui'

const LENS = [3, 4, 5] as const
const SPECIES: readonly AvatarSpecies[] = ['bull', 'cow']
const ROW = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  minHeight: 52,
} as const
const DIVIDER = { borderBottom: '1px solid #ECE5D2' } as const

export interface SettingsCardProps {
  profile: ProfileDto
  onPatch(patch: SettingsPatch): void
  desktop?: boolean
}

export function SettingsCard({ profile, onPatch, desktop = false }: SettingsCardProps) {
  const { t } = useTranslation()
  return (
    <Card
      style={{
        padding: desktop ? '8px 24px' : '6px 14px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ ...ROW, ...DIVIDER }}>
        <span style={{ fontWeight: 800 }}>{t('settings.sound')}</span>
        <Toggle
          on={profile.sound}
          label={t('settings.sound')}
          onChange={(sound) => onPatch({ sound })}
        />
      </div>
      <div style={{ ...ROW, ...DIVIDER }}>
        <span style={{ fontWeight: 800 }}>{t('settings.vibration')}</span>
        <Toggle
          on={profile.vibrate}
          label={t('settings.vibration')}
          onChange={(vibrate) => onPatch({ vibrate })}
        />
      </div>
      <div style={{ ...ROW, ...DIVIDER, minHeight: 60 }}>
        <span style={{ fontWeight: 800 }}>{t('settings.difficulty')}</span>
        <Seg
          label={t('settings.difficultyDefault')}
          value={String(profile.defaultLen) as `${(typeof LENS)[number]}`}
          options={LENS.map((n) => ({
            value: String(n) as `${(typeof LENS)[number]}`,
            label: t('profile.digitsOption', { count: n }),
          }))}
          onChange={(v) => onPatch({ defaultLen: Number(v) as (typeof LENS)[number] })}
        />
      </div>
      <div style={{ ...ROW, ...DIVIDER, minHeight: 60 }}>
        <span style={{ fontWeight: 800 }}>{t('settings.avatar')}</span>
        <Seg
          label={t('settings.avatar')}
          value={profile.avatarSpecies}
          options={SPECIES.map((s) => ({ value: s, label: t(`species.${s}`) }))}
          onChange={(avatarSpecies) => onPatch({ avatarSpecies })}
        />
      </div>
      <div style={{ ...ROW, minHeight: 60 }}>
        <span style={{ fontWeight: 800 }}>{t('settings.lang')}</span>
        <LangSwitch />
      </div>
    </Card>
  )
}
