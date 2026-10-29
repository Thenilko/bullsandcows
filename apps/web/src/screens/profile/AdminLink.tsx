import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

const ROW = { width: '100%', boxSizing: 'border-box', textDecoration: 'none', color: 'inherit', marginTop: 12 } as const

/** Профил → „Админ панел“, only for the admin (`me.isAdmin`); a row like „Твоето пасище“. */
export function AdminLink() {
  const { t } = useTranslation()
  return (
    <Link to="/admin" className="unl" style={ROW}>
      <span className="unl-ic" aria-hidden="true" style={{ fontSize: 22, fontWeight: 900 }}>
        ▤
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 15 }}>{t('admin.link')}</b>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--c-muted-aa)' }}>{t('admin.linkSub')}</span>
      </span>
      <span aria-hidden="true" style={{ fontSize: 22, fontWeight: 900, color: '#6B7560' }}>
        ›
      </span>
    </Link>
  )
}
