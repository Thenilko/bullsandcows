import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Card, Cta } from '../components/ui'

/** A chunk of an older deploy that the server no longer has: the fix is a fresh page. */
const STALE_CHUNK = /dynamically imported module|Importing a module script failed|Failed to fetch/i

export const isStaleChunkError = (err: unknown): boolean =>
  err instanceof Error && STALE_CHUNK.test(err.message)

const ROOT_STYLE = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  background: '#EFE9D7',
} as const

/** Shown instead of React Router's default error page when a route or its lazy chunk fails. */
export function RouteError() {
  const { t } = useTranslation()
  const err = useRouteError()
  const stale = isStaleChunkError(err)
  const notFound = isRouteErrorResponse(err) && err.status === 404
  const text = stale ? t('crash.stale') : notFound ? t('crash.notFound') : t('crash.generic')
  return (
    <main style={ROOT_STYLE}>
      <Card style={{ maxWidth: 420, padding: 28, display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{t('crash.title')}</h1>
        <p style={{ margin: 0, fontWeight: 700, lineHeight: 1.45, color: '#4A5640' }}>{text}</p>
        <Cta onClick={() => window.location.reload()}>{t('crash.reload')}</Cta>
      </Card>
    </main>
  )
}
