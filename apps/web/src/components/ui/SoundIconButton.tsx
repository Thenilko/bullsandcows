import { useTranslation } from 'react-i18next'
import { useSoundToggle } from '../../features/stats/useSoundToggle'
import { SoundOffIcon, SoundOnIcon } from './icons'

/** The `iconbox` mute toggle of the prototypes (solo header row, PasDuel top row). */
export function SoundIconButton() {
  const { t } = useTranslation()
  const { muted, toggle } = useSoundToggle()
  return (
    <button
      type="button"
      className="iconbox icobtn"
      aria-label={muted ? t('settings.muteOff') : t('settings.muteOn')}
      aria-pressed={!muted}
      onClick={toggle}
    >
      {muted ? <SoundOffIcon /> : <SoundOnIcon />}
    </button>
  )
}
