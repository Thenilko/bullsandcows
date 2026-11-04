import type { Lang } from '@bc/i18n'
import { useTranslation } from 'react-i18next'
import { useAdminOnline } from '../../features/admin/useAdminGames'
import styles from './admin.module.css'
import { formatTime } from './format'

/** Who has the app open right now, what screen, and the solo game they are in (secret and guesses so far). */
export function AdminOnline({ enabled, lang }: { enabled: boolean; lang: Lang }) {
  const { t } = useTranslation()
  const online = useAdminOnline(enabled)
  const data = online.data
  if (online.isError && !data) return <p className={styles.empty}>{t('admin.error')}</p>
  if (!data) return <p className={styles.empty}>{t('admin.loading')}</p>
  return (
    <>
      <p className={styles.onlineCount}>
        <span className={styles.dot} aria-hidden="true" />
        {t('admin.online.count', { count: data.players.length, minutes: data.windowMinutes })}
      </p>
      {data.players.length === 0 ? (
        <p className={styles.empty}>{t('admin.online.none')}</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('admin.list.name')}</th>
                <th scope="col" className={styles.num}>{t('admin.list.level')}</th>
                <th scope="col">{t('admin.online.doing')}</th>
                <th scope="col">{t('admin.online.game')}</th>
                <th scope="col">{t('admin.online.seen')}</th>
              </tr>
            </thead>
            <tbody>
              {data.players.map((p) => (
                <tr key={p.id}>
                  <th scope="row">
                    {p.username}
                    {p.isGuest ? <span className={styles.tag}>{t('admin.list.guest')}</span> : null}
                  </th>
                  <td className={styles.num}>{p.level}</td>
                  <td>{t(`admin.online.activity.${p.activity ?? 'other'}`)}</td>
                  <td>
                    {p.game ? (
                      <>
                        {t(`admin.games.kind.${p.game.kind}`)} · <span className={styles.code}>{p.game.secret}</span> ·{' '}
                        {t('admin.online.attempts', { count: p.game.attempts })}
                      </>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td>{formatTime(p.lastSeenAt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
