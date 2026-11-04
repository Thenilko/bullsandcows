import type { AdminGameDto, AdminGameSideDto, AdminPlayerRefDto } from '@bc/protocol'
import type { Lang } from '@bc/i18n'
import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdminGame, useAdminGames } from '../../features/admin/useAdminGames'
import styles from './admin.module.css'
import { formatDateTime } from './format'

const COLUMNS = 8

function Opponent({ game }: { game: AdminGameDto }) {
  const { t } = useTranslation()
  const duel = game.duel
  if (!duel) return <span className={styles.muted}>—</span>
  if (duel.opponentKind === 'bot') return <>{t('admin.feed.bot', { level: duel.botLevel ?? 1 })}</>
  return <>{duel.opponent?.username ?? t('admin.feed.deleted')}</>
}

function Result({ game }: { game: AdminGameDto }) {
  const { t } = useTranslation()
  const tone = game.won === true ? 'green' : game.won === false ? 'red' : 'ink'
  const label = game.finishedAt === null ? t('admin.feed.playing') : game.won ? t('admin.feed.won') : t('admin.feed.lost')
  const reason = game.duel?.outcome ? ` · ${t(`admin.feed.reason.${game.duel.outcome}`, { defaultValue: game.duel.outcome })}` : ''
  return (
    <span className={styles.result} data-tone={tone}>
      {label}
      {reason}
    </span>
  )
}

function Side({ side, lang }: { side: AdminGameSideDto; lang: Lang }) {
  const { t } = useTranslation()
  const { game, guesses } = side
  return (
    <div className={styles.side}>
      <p className={styles.sideHead}>
        <strong>{game.player.username}</strong> {t('admin.feed.searched')} <span className={styles.code}>{game.secret}</span>
        {game.suspicious ? <span className={styles.tag}>{t('admin.feed.suspicious')}</span> : null}
        {game.usedNotes ? <span className={styles.tag}>{t('admin.feed.notes')}</span> : null}
      </p>
      {guesses.length === 0 ? (
        <p className={styles.empty}>{game.duel ? t('admin.feed.noDuelGuesses') : t('admin.feed.noGuesses')}</p>
      ) : (
        <ol className={styles.guesses}>
          {guesses.map((g) => (
            <li key={g.guess} data-solved={g.bulls === game.len || undefined} title={formatDateTime(g.at, lang)}>
              <span className={styles.code}>{g.guess}</span>
              <span className={styles.bc}>
                {t('admin.feed.bulls', { count: g.bulls })} {t('admin.feed.cows', { count: g.cows })}
              </span>
              {g.consistent ? null : <span className={styles.wasted}>{t('admin.feed.wasted')}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Detail({ id, lang }: { id: string; lang: Lang }) {
  const { t } = useTranslation()
  const detail = useAdminGame(id)
  if (detail.isError) return <p className={styles.empty}>{t('admin.feed.detailError')}</p>
  if (!detail.data) return <p className={styles.empty}>{t('admin.loading')}</p>
  return (
    <div className={styles.sides}>
      <Side side={detail.data.side} lang={lang} />
      {detail.data.opponent ? <Side side={detail.data.opponent} lang={lang} /> : null}
    </div>
  )
}

/** Every game, newest first: who played whom, the secret, the result, and on demand every guess. */
export function AdminGames({ enabled, lang }: { enabled: boolean; lang: Lang }) {
  const { t } = useTranslation()
  const [player, setPlayer] = useState<AdminPlayerRefDto | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const feed = useAdminGames(enabled, player?.id ?? null)
  const games = feed.data?.pages.flatMap((p) => p.games) ?? []

  return (
    <>
      {player ? (
        <p className={styles.filter}>
          {t('admin.feed.only', { name: player.username })}
          <button type="button" className={styles.link} onClick={() => setPlayer(null)}>
            {t('admin.feed.all')}
          </button>
        </p>
      ) : null}
      {feed.isError && games.length === 0 ? (
        <p className={styles.empty}>{t('admin.error')}</p>
      ) : !feed.data ? (
        <p className={styles.empty}>{t('admin.loading')}</p>
      ) : games.length === 0 ? (
        <p className={styles.empty}>{t('admin.games.empty')}</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('admin.feed.when')}</th>
                <th scope="col">{t('admin.list.name')}</th>
                <th scope="col">{t('admin.games.mode')}</th>
                <th scope="col">{t('admin.feed.against')}</th>
                <th scope="col">{t('admin.feed.secret')}</th>
                <th scope="col" className={styles.num}>{t('admin.feed.attempts')}</th>
                <th scope="col">{t('admin.feed.result')}</th>
                <th scope="col">
                  <span className="sr-only">{t('admin.feed.moves')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const expanded = open === g.id
                return (
                  <Fragment key={g.id}>
                    <tr>
                      <td>{formatDateTime(g.createdAt, lang)}</td>
                      <th scope="row">
                        <button type="button" className={styles.link} onClick={() => setPlayer(g.player)}>
                          {g.player.username}
                        </button>
                      </th>
                      <td>
                        {t(`admin.games.kind.${g.kind}`)}
                        <span className={styles.settings}>
                          {t(g.zero ? 'admin.feed.settingsZero' : 'admin.feed.settings', { len: g.len })}
                        </span>
                        {g.practice ? <span className={styles.tag}>{t('admin.feed.practice')}</span> : null}
                      </td>
                      <td>
                        <Opponent game={g} />
                      </td>
                      <td>
                        <span className={styles.code}>{g.secret}</span>
                      </td>
                      <td className={styles.num}>{g.attempts}</td>
                      <td>
                        <Result game={g} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.link}
                          aria-expanded={expanded}
                          onClick={() => setOpen(expanded ? null : g.id)}
                        >
                          {expanded ? t('admin.feed.hide') : t('admin.feed.moves')}
                        </button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className={styles.detailRow}>
                        <td colSpan={COLUMNS}>
                          <Detail id={g.id} lang={lang} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {feed.hasNextPage ? (
        <button
          type="button"
          className={styles.more}
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
        >
          {t('admin.feed.more')}
        </button>
      ) : null}
    </>
  )
}
