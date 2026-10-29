import type { AdminKindDto, AdminOverviewDto, AdminSocialDto, AdminUserDto } from '@bc/protocol'
import type { Lang } from '@bc/i18n'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './admin.module.css'
import { formatCount, formatDate, formatDateTime } from './format'

type Tone = 'red' | 'green' | 'sun' | 'ink'

interface StatProps {
  label: string
  value: string
  sub?: string
  tone?: Tone
}

function Stat({ label, value, sub, tone = 'ink' }: StatProps) {
  return (
    <div className={styles.stat} data-tone={tone}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={styles.statValue}>{value}</dd>
      {sub ? <dd className={styles.statSub}>{sub}</dd> : null}
    </div>
  )
}

interface SectionProps {
  id: string
  title: string
  children: ReactNode
  wide?: boolean
}

export function Section({ id, title, children, wide = false }: SectionProps) {
  return (
    <section className={styles.section} data-wide={wide || undefined} aria-labelledby={id}>
      <h2 id={id} className={styles.h2}>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** The headline row: players, how many came back, and games. */
export function AdminKpis({ data, lang }: { data: AdminOverviewDto; lang: Lang }) {
  const { t } = useTranslation()
  const n = (v: number) => formatCount(v, lang)
  const { users, games } = data
  return (
    <dl className={styles.kpis}>
      <Stat
        label={t('admin.users.total')}
        value={n(users.total)}
        sub={`${n(users.members)} ${t('admin.users.members')} · ${n(users.guests)} ${t('admin.users.guests')}`}
      />
      <Stat label={t('admin.users.active1d')} value={n(users.active1d)} tone="green" sub={`${t('admin.users.active7d')}: ${n(users.active7d)}`} />
      <Stat label={t('admin.users.new7d')} value={n(users.new7d)} tone="sun" sub={t('admin.users.new30d', { count: users.new30d })} />
      <Stat label={t('admin.games.total')} value={n(games.total)} tone="red" sub={t('admin.games.finished', { count: games.finished })} />
    </dl>
  )
}

export function AdminKinds({ kinds, lang }: { kinds: readonly AdminKindDto[]; lang: Lang }) {
  const { t } = useTranslation()
  if (kinds.length === 0) return <p className={styles.empty}>{t('admin.games.empty')}</p>
  const most = Math.max(...kinds.map((k) => k.total))
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('admin.games.mode')}</th>
            <th scope="col" className={styles.num}>{t('admin.games.count')}</th>
            <th scope="col" className={styles.num}>{t('admin.games.winRate')}</th>
            <th scope="col" className={styles.num}>{t('admin.games.avgAttempts')}</th>
          </tr>
        </thead>
        <tbody>
          {kinds.map((k) => (
            <tr key={k.kind}>
              <th scope="row">
                {t(`admin.games.kind.${k.kind}`)}
                <span className={styles.meter} aria-hidden="true">
                  <span style={{ transform: `scaleX(${k.total / most})` }} />
                </span>
              </th>
              <td className={styles.num}>{formatCount(k.total, lang)}</td>
              <td className={styles.num}>{k.finished > 0 ? `${k.winRate}%` : '—'}</td>
              <td className={styles.num}>{k.avgAttempts ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdminSocial({ social, lang }: { social: AdminSocialDto; lang: Lang }) {
  const { t } = useTranslation()
  const n = (v: number) => formatCount(v, lang)
  const { quick, friend, bot } = social.duelsByOpponent
  return (
    <dl className={styles.mini}>
      <Stat
        label={t('admin.social.duels')}
        value={n(social.duels)}
        sub={`${t('admin.social.duels7d', { count: social.duels7d })} · ${n(quick)} ${t('admin.social.quick')}, ${n(friend)} ${t('admin.social.friend')}, ${n(bot)} ${t('admin.social.bot')}`}
      />
      <Stat label={t('admin.social.farms')} value={n(social.farms)} sub={t('admin.social.farmMembers', { count: social.farmMembers })} />
      <Stat label={t('admin.social.weekly')} value={n(social.weeklyPlayers7d)} />
      <Stat label={t('admin.social.shares')} value={n(social.shares)} />
      <Stat label={t('admin.social.nudges')} value={n(social.nudges)} />
    </dl>
  )
}

export function AdminUsers({ users, lang }: { users: readonly AdminUserDto[]; lang: Lang }) {
  const { t } = useTranslation()
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('admin.list.name')}</th>
            <th scope="col">{t('admin.list.email')}</th>
            <th scope="col" className={styles.num}>{t('admin.list.level')}</th>
            <th scope="col" className={styles.num}>{t('admin.list.games')}</th>
            <th scope="col">{t('admin.list.last')}</th>
            <th scope="col">{t('admin.list.joined')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <th scope="row">
                {u.username}
                {u.isGuest ? <span className={styles.tag}>{t('admin.list.guest')}</span> : null}
              </th>
              <td className={styles.email}>{u.email ?? '—'}</td>
              <td className={styles.num}>{u.level}</td>
              <td className={styles.num}>{formatCount(u.games, lang)}</td>
              <td>{u.lastGameAt === null ? t('admin.list.never') : formatDateTime(u.lastGameAt, lang)}</td>
              <td>{formatDate(u.createdAt, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
