import { useTranslation } from 'react-i18next'

export function Home() {
  const { t } = useTranslation()
  return (
    <main>
      <h1>{t('login.title')}</h1>
    </main>
  )
}
