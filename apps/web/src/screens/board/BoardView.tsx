import type { LeaderboardDto } from '@bc/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Cta, Podium } from '../../components/ui'
import type { PodiumRow } from '../../components/ui/Podium'
import { UpgradeDialog } from '../../features/auth/UpgradeDialog'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { BoardFilters, type BoardFilterState } from './BoardFilters'
import { BoardRows } from './BoardRows'

export type BoardStatus = 'loading' | 'error' | 'guest' | 'ready'

export interface BoardViewProps {
  status: BoardStatus
  filters: BoardFilterState
  onFilters(next: BoardFilterState): void
  data?: LeaderboardDto
  onPlay(): void
}

const NOTE = { margin: 0, fontWeight: 700, color: '#4A5640', lineHeight: 1.45 } as const

function podiumRows(data: LeaderboardDto): PodiumRow[] {
  return data.rows.flatMap((r) =>
    r.rank === 1 || r.rank === 2 || r.rank === 3
      ? [{ rank: r.rank, name: r.username, score: r.score, rankKey: r.rankKey }]
      : [],
  )
}

function GuestGate() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ ...NOTE, fontSize: 17 }}>{t('board.guestOnly')}</p>
      {open ? (
        <UpgradeDialog />
      ) : (
        <Cta onClick={() => setOpen(true)}>{t('common.createProfile')}</Cta>
      )}
    </div>
  )
}

function Empty({ onPlay }: { onPlay(): void }) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={NOTE}>{t('board.bestGame', { best: t('board.noBestGame') })}</p>
      <Cta onClick={onPlay}>{t('board.playNow')}</Cta>
    </div>
  )
}

function YourPlace({ me }: { me: NonNullable<LeaderboardDto['me']> }) {
  const { t } = useTranslation()
  return (
    <Card
      style={{
        padding: '12px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 800,
      }}
    >
      <span>{t('board.youRank', { rank: me.rank })}</span>
      <span style={{ color: '#8E3424' }}>{t('board.youTop', { top: me.top })}</span>
    </Card>
  )
}

function BestGame({ data }: { data: LeaderboardDto }) {
  const { t } = useTranslation()
  const mine = data.rows.find((r) => r.you)
  // The API has no per-game time, so only the attempt count is shown.
  const best = mine ? t('common.attempts', { count: mine.attempts }) : t('board.noBestGame')
  return <p style={{ ...NOTE, lineHeight: 1.5 }}>{t('board.bestGame', { best })}</p>
}

/** D6 aside: "Твоето място" built from `me`. */
function PlaceAside({ data, onPlay }: { data: LeaderboardDto; onPlay(): void }) {
  const { t } = useTranslation()
  return (
    <aside
      className="card"
      style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{t('board.yourPlace')}</h2>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 40, fontWeight: 900 }}>
          {data.me ? t('board.rank', { rank: data.me.rank }) : '\u2014'}
        </span>
        <span style={{ fontWeight: 900, color: '#8E3424' }}>
          {data.me ? t('board.top', { top: data.me.top }) : ''}
        </span>
      </div>
      <BestGame data={data} />
      <Cta small onClick={onPlay}>
        {t('board.playNow')}
      </Cta>
    </aside>
  )
}

function Ready({ data, onPlay, wide }: { data: LeaderboardDto; onPlay(): void; wide: boolean }) {
  if (data.rows.length === 0) return <Empty onPlay={onPlay} />
  return (
    <>
      <div style={wide ? { maxWidth: 560, width: '100%', alignSelf: 'center' } : undefined}>
        <Podium rows={podiumRows(data)} />
      </div>
      <BoardRows rows={data.rows} wide={wide} />
      {data.me && !wide ? <YourPlace me={data.me} /> : null}
    </>
  )
}

function Body({
  status,
  filters,
  onFilters,
  data,
  onPlay,
  wide,
}: BoardViewProps & { wide: boolean }) {
  const { t } = useTranslation()
  if (status === 'guest') return <GuestGate />
  return (
    <>
      <BoardFilters value={filters} onChange={onFilters} part={wide ? 'options' : 'all'} />
      {status === 'loading' ? (
        <p role="status" style={NOTE}>
          {t('common.loading')}
        </p>
      ) : null}
      {status === 'error' ? (
        <p role="alert" style={NOTE}>
          {t('error.unknown')}
        </p>
      ) : null}
      {status === 'ready' && data ? <Ready data={data} onPlay={onPlay} wide={wide} /> : null}
    </>
  )
}

export function BoardView(props: BoardViewProps) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const { status, filters, onFilters, data, onPlay } = props
  const title = t('board.titleDigits', { count: filters.len })
  if (!desktop) {
    return (
      <section
        aria-label={t('board.title')}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{title}</h1>
        <Body {...props} wide={false} />
      </section>
    )
  }
  const showAside = status === 'ready' && data !== undefined
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: showAside ? 'minmax(0, 1.6fr) minmax(240px, 1fr)' : '1fr',
        gap: 24,
        alignItems: 'start',
      }}
    >
      <section
        aria-label={t('board.title')}
        className="card rise"
        style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>{title}</h1>
          {status === 'guest' ? null : (
            <BoardFilters value={filters} onChange={onFilters} part="period" />
          )}
        </div>
        <Body
          status={status}
          filters={filters}
          onFilters={onFilters}
          data={data}
          onPlay={onPlay}
          wide
        />
      </section>
      {showAside ? <PlaceAside data={data} onPlay={onPlay} /> : null}
    </div>
  )
}
