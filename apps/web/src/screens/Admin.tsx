import type { Lang } from '@bc/i18n'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useAdminOverview } from '../features/admin/useAdminOverview'
import { useMe } from '../features/stats/useMe'
import { ApiError } from '../lib/api'
import { AdminChart } from './admin/AdminChart'
import { AdminKinds, AdminKpis, AdminSocial, AdminUsers, Section } from './admin/AdminSections'
import styles from './admin/admin.module.css'
import { formatTime } from './admin/format'

/** `/admin`: how the app is doing. Shown to the admin only; the API refuses everyone else (403). */
export function Admin() {
  const { t, i18n } = useTranslation()
  const lang: Lang = i18n.language === 'en' ? 'en' : 'bg'
  const me = useMe()
  const isAdmin = me.data?.isAdmin === true
  const overview = useAdminOverview(isAdmin)
  const forbidden =
    (me.data !== undefined && !isAdmin) || (overview.error instanceof ApiError && overview.error.status === 403)
  const data = overview.data

  return (
    <main className={styles.page} id="main">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{t('admin.linkSub')}</p>
          <h1 className={styles.h1}>{t('admin.title')}</h1>
        </div>
        <div className={styles.actions}>
          {data ? <span className={styles.updated}>{t('admin.updated', { time: formatTime(data.generatedAt, lang) })}</span> : null}
          {isAdmin ? (
            <button type="button" className={styles.button} onClick={() => void overview.refetch()} disabled={overview.isFetching}>
              {t('admin.refresh')}
            </button>
          ) : null}
          <Link to="/" className={styles.back}>
            {t('admin.back')}
          </Link>
        </div>
      </header>

      {forbidden ? (
        <p role="alert" className={styles.notice}>
          {t('admin.forbidden')}
        </p>
      ) : me.isError || (overview.isError && !data) ? (
        <p role="alert" className={styles.notice}>
          {t('admin.error')}
        </p>
      ) : !data ? (
        <p role="status" className={styles.notice}>
          {t('admin.loading')}
        </p>
      ) : (
        <div className={styles.grid}>
          <AdminKpis data={data} lang={lang} />
          <Section id="admin-chart" title={t('admin.chart.heading')} wide>
            <AdminChart days={data.days} lang={lang} />
          </Section>
          <Section id="admin-games" title={t('admin.games.heading')}>
            <AdminKinds kinds={data.kinds} lang={lang} />
          </Section>
          <Section id="admin-social" title={t('admin.social.heading')}>
            <AdminSocial social={data.social} lang={lang} />
          </Section>
          <Section id="admin-users" title={t('admin.list.heading')} wide>
            <AdminUsers users={data.recentUsers} lang={lang} />
          </Section>
        </div>
      )}
    </main>
  )
}
