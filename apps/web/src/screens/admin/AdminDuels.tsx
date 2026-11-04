import type { AdminDuelStatsDto, AdminOutcomeRowDto } from '@bc/protocol'
import type { Lang } from '@bc/i18n'
import { useTranslation } from 'react-i18next'
import { useAdminDuelStats } from '../../features/admin/useAdminGames'
import styles from './admin.module.css'
import { formatCount } from './format'

const BOT_KEYS: Readonly<Record<number, string>> = {
  1: 'easy',
  2: 'normal',
  3: 'hard',
  4: 'expert',
}
/** The endings shown as columns; the rest add up under „друго“. */
const REASONS = ['solved', 'timeout', 'disconnect', 'giveUp'] as const

const percent = (part: number, whole: number): string =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'

function BotTable({ rows, lang }: { rows: AdminDuelStatsDto['bot']; lang: Lang }) {
  const { t } = useTranslation()
  if (rows.length === 0) return <p className={styles.empty}>{t('admin.duels.noBot')}</p>
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className={styles.caption}>{t('admin.duels.botHeading')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('admin.duels.botLevel')}</th>
            <th scope="col" className={styles.num}>
              {t('admin.duels.games')}
            </th>
            <th scope="col" className={styles.num}>
              {t('admin.duels.humanWins')}
            </th>
            <th scope="col" className={styles.num}>
              {t('admin.duels.noWinner')}
            </th>
            <th scope="col" className={styles.num}>
              {t('admin.duels.humanAttempts')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.format}-${r.level}`}>
              <th scope="row">
                {t(`admin.duels.format.${r.format}`)} ·{' '}
                {t(`bot.level.${BOT_KEYS[r.level] ?? 'easy'}.name`)}
              </th>
              <td className={styles.num}>{formatCount(r.games, lang)}</td>
              <td className={styles.num}>{percent(r.humanWins, r.games)}</td>
              <td className={styles.num}>{formatCount(r.noWinner, lang)}</td>
              <td className={styles.num}>{r.humanAttempts ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface OutcomeGroup {
  readonly key: string
  readonly format: AdminOutcomeRowDto['format']
  readonly opponentKind: AdminOutcomeRowDto['opponentKind']
  readonly byReason: ReadonlyMap<string, number>
  readonly total: number
}

function groupOutcomes(rows: readonly AdminOutcomeRowDto[]): OutcomeGroup[] {
  const groups = new Map<string, OutcomeGroup>()
  for (const r of rows) {
    const key = `${r.format}-${r.opponentKind}`
    const g = groups.get(key) ?? {
      key,
      format: r.format,
      opponentKind: r.opponentKind,
      byReason: new Map(),
      total: 0,
    }
    const byReason = new Map(g.byReason).set(r.reason, (g.byReason.get(r.reason) ?? 0) + r.count)
    groups.set(key, { ...g, byReason, total: g.total + r.count })
  }
  return [...groups.values()]
}

function OutcomeTable({ rows, lang }: { rows: readonly AdminOutcomeRowDto[]; lang: Lang }) {
  const { t } = useTranslation()
  const groups = groupOutcomes(rows)
  if (groups.length === 0) return <p className={styles.empty}>{t('admin.duels.noDuels')}</p>
  const other = (g: OutcomeGroup) =>
    g.total - REASONS.reduce((sum, r) => sum + (g.byReason.get(r) ?? 0), 0)
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className={styles.caption}>{t('admin.duels.outcomesHeading')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('admin.duels.duel')}</th>
            <th scope="col" className={styles.num}>
              {t('admin.duels.games')}
            </th>
            {REASONS.map((r) => (
              <th key={r} scope="col" className={styles.num}>
                {t(`admin.feed.reason.${r}`)}
              </th>
            ))}
            <th scope="col" className={styles.num}>
              {t('admin.duels.other')}
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.key}>
              <th scope="row">
                {t(`admin.duels.format.${g.format}`)} ·{' '}
                {t(`admin.duels.opponent.${g.opponentKind}`)}
              </th>
              <td className={styles.num}>{formatCount(g.total, lang)}</td>
              {REASONS.map((r) => (
                <td key={r} className={styles.num}>
                  {percent(g.byReason.get(r) ?? 0, g.total)}
                </td>
              ))}
              <td className={styles.num}>{percent(other(g), g.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ThinkTable({ rows, lang }: { rows: AdminDuelStatsDto['think']; lang: Lang }) {
  const { t } = useTranslation()
  if (rows.length === 0) return <p className={styles.empty}>{t('admin.duels.noThink')}</p>
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className={styles.caption}>{t('admin.duels.thinkHeading')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('admin.duels.where')}</th>
            <th scope="col" className={styles.num}>
              {t('admin.duels.moves')}
            </th>
            <th scope="col" className={styles.num}>
              {t('admin.duels.p50')}
            </th>
            <th scope="col" className={styles.num}>
              {t('admin.duels.p90')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.scope}-${r.len}`}>
              <th scope="row">
                {t(`admin.duels.scope.${r.scope}`)} · {t('admin.duels.digits', { count: r.len })}
              </th>
              <td className={styles.num}>{formatCount(r.moves, lang)}</td>
              <td className={styles.num}>{t('admin.duels.secs', { count: r.p50 })}</td>
              <td className={styles.num}>{t('admin.duels.secs', { count: r.p90 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** „Дуели и бот“: is the bot too strong, do duels end on the clock, how long a guess takes. */
export function AdminDuels({ enabled, lang }: { enabled: boolean; lang: Lang }) {
  const { t } = useTranslation()
  const stats = useAdminDuelStats(enabled)
  const data = stats.data
  if (stats.isError && !data) return <p className={styles.empty}>{t('admin.error')}</p>
  if (!data) return <p className={styles.empty}>{t('admin.loading')}</p>
  return (
    <div className={styles.stack}>
      <p className={styles.empty}>{t('admin.duels.window', { count: data.windowDays })}</p>
      <BotTable rows={data.bot} lang={lang} />
      <OutcomeTable rows={data.outcomes} lang={lang} />
      <ThinkTable rows={data.think} lang={lang} />
    </div>
  )
}
