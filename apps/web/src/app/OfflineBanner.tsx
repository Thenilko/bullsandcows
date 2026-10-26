import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const BANNER_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 50,
  padding: '8px 16px',
  background: '#2E3B24',
  color: '#FFFFFF',
  fontWeight: 800,
  fontSize: 14,
  textAlign: 'center',
} as const

/** Top-of-app notice shown while the browser reports no connection. */
export function OfflineBanner() {
  const { t } = useTranslation()
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  if (online) return null
  return (
    <div role="status" style={BANNER_STYLE}>
      {t('common.offline')}
    </div>
  )
}
