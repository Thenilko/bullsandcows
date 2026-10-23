import type { Lang } from '@bc/i18n'
import { useTranslation } from 'react-i18next'
import { api } from '../../features/auth/client'
import { useSession } from '../../features/auth/session'
import { setLang } from '../../i18n'
import { sfx } from '../../lib/sound'
import { Pill } from './Pill'

const LANGS: readonly Lang[] = ['bg', 'en']

/** Two pills; also saves the choice to the profile when signed in (errors ignored). */
export function LangSwitch() {
  const { t, i18n } = useTranslation()
  const authed = useSession((s) => s.session !== null)

  function pick(lang: Lang) {
    sfx.play('tap')
    setLang(lang)
    if (authed) void api.patch('/api/me/settings', { lang }).catch(() => undefined)
  }

  return (
    <div role="group" aria-label={t('settings.lang')} style={{ display: 'flex', gap: 8 }}>
      {LANGS.map((lang) => (
        <Pill key={lang} on={i18n.language === lang} onClick={() => pick(lang)}>
          {t(`common.lang.${lang}`)}
        </Pill>
      ))}
    </div>
  )
}
