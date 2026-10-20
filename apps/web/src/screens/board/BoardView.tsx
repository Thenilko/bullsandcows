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
      ? [{ rank: r.rank, name: r.username, score: r.score }]
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

function Ready({ data, onPlay }: { data: LeaderboardDto; onPlay(): void }) {
  if (data.rows.length === 0) return <Empty onPlay={onPlay} />
  return (
    <>
      <Podium rows={podiumRows(data)} />
      <BoardRows rows={data.rows} />
      {data.me ? <YourPlace me={data.me} /> : null}
    </>
  )
}

export function BoardView({ status, filters, onFilters, data, onPlay }: BoardViewProps) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  return (
    <section
      aria-label={t('board.title')}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <h1 style={{ margin: 0, fontSize: desktop ? 34 : 24, fontWeight: 900 }}>
        {t('board.titleDigits', { count: filters.len })}
      </h1>
      {status === 'guest' ? (
        <GuestGate />
      ) : (
        <>
          <BoardFilters value={filters} onChange={onFilters} />
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
          {status === 'ready' && data ? <Ready data={data} onPlay={onPlay} /> : null}
        </>
      )}
    </section>
  )
}
