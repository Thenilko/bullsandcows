import { useTranslation } from 'react-i18next'
import { Chip, Confetti, Cta, Inset, Soft } from '../../components/ui'
import { Bar } from '../../components/ui/Bar'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import type { ResultModel } from './resultModel'

const STAR_PATH = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z'
const STAR_COUNT = 5
const STAR_ON = '#F2C230'
const STAR_OFF = '#F3EEDF'
const FULL_SCREEN = { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20 } as const
const OVERLAY = { position: 'fixed', inset: 0, zIndex: 10 } as const
const SHEET_BASE = {
  position: 'fixed',
  zIndex: 11,
  background: '#FFFDF6',
  display: 'flex',
  flexDirection: 'column',
  textAlign: 'center',
  overflowY: 'auto',
} as const
const SHEET_MOBILE = {
  ...SHEET_BASE,
  left: 10,
  right: 10,
  bottom: 10,
  maxHeight: 'calc(100dvh - 20px)',
  padding: '22px 18px 18px',
  borderRadius: 28,
  boxShadow: '0 18px 40px rgba(30,40,20,.3)',
  gap: 12,
} as const
const SHEET_DESKTOP = {
  ...SHEET_BASE,
  left: 0,
  right: 0,
  top: 90,
  margin: '0 auto',
  width: 'min(560px, calc(100% - 32px))',
  maxHeight: 'calc(100dvh - 110px)',
  padding: '30px 28px 24px',
  borderRadius: 30,
  boxShadow: '0 24px 60px rgba(30,40,20,.35)',
  gap: 14,
} as const
const MUTED = { fontWeight: 700, color: '#4A5640', lineHeight: 1.45 } as const

export interface ResultViewProps {
  model: ResultModel
  shareLabel: string
  onAgain(): void
  onShare(): void
  onBoard(): void
}

function Stars({ model, size }: { model: ResultModel; size: number }) {
  const { t } = useTranslation()
  return (
    <div
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}
      role="img"
      aria-label={t('result.starsAria', { count: model.stars })}
    >
      {Array.from({ length: STAR_COUNT }, (_, i) => (
        <svg
          key={i}
          className="boing"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i < model.stars ? STAR_ON : STAR_OFF}
          stroke="#7A5230"
          strokeWidth="1.4"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ animationDelay: `${(0.4 + i * 0.1).toFixed(1)}s` }}
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
      <span style={{ marginLeft: 8, fontWeight: 900, color: '#8E3424' }}>
        {t(`rank.${model.rankKey}`)}
      </span>
    </div>
  )
}

function TopBadge({ model, desktop }: { model: ResultModel; desktop: boolean }) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        alignSelf: 'center',
        padding: desktop ? '14px 30px' : '10px 22px',
        borderRadius: 20,
        background: '#B5452F',
        color: '#FFFFFF',
        boxShadow: '0 4px 0 #7E2E1E',
        transform: 'rotate(-2deg)',
      }}
    >
      <div style={{ fontSize: desktop ? 60 : 46, fontWeight: 900, lineHeight: 1 }}>
        {t('result.top', { top: model.top })}
      </div>
      <div style={{ fontWeight: 800 }}>
        {t(model.daily ? 'result.beatToday' : 'result.beat', { beat: model.beat })}
      </div>
    </div>
  )
}

function Tile({ value, label, tint }: { value: string | number; label: string; tint?: string }) {
  return (
    <Inset style={{ padding: '8px 2px', background: tint }}>
      <div style={{ fontSize: 20, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#4A5640' }}>{label}</div>
    </Inset>
  )
}

function Tip({ model }: { model: ResultModel }) {
  const { t } = useTranslation()
  if (!model.won) return <p style={{ ...MUTED, margin: 0, fontSize: 14 }}>{t('result.tip.lose')}</p>
  const waste =
    model.wasted > 0 ? t('result.tip.wasted', { count: model.wasted }) : t('result.tip.none')
  return (
    <p style={{ ...MUTED, margin: 0, fontSize: 14 }}>
      {waste} {t('result.tip.avg', { avg: model.avg.toFixed(1) })}
    </p>
  )
}

function Distribution({ model, desktop }: { model: ResultModel; desktop: boolean }) {
  const { t } = useTranslation()
  return (
    <>
      <div
        role="img"
        aria-label={t('result.distribution')}
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: desktop ? 4 : 3,
          height: desktop ? 70 : 50,
        }}
      >
        {model.bars.map((b, i) => (
          <Bar key={i} h={b.h} c={b.c} d={b.d} style={{ flex: 1, width: 'auto' }} />
        ))}
      </div>
      {model.fallback ? (
        <p style={{ ...MUTED, margin: 0, fontSize: 12 }}>{t('result.approxNote')}</p>
      ) : null}
    </>
  )
}

function Actions({
  onAgain,
  onShare,
  onBoard,
  shareLabel,
  desktop,
}: Omit<ResultViewProps, 'model'> & { desktop: boolean }) {
  const { t } = useTranslation()
  if (!desktop) {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <Cta onClick={onAgain}>{t('result.again')}</Cta>
          <Soft onClick={onShare}>{shareLabel}</Soft>
        </div>
        <button
          type="button"
          onClick={onBoard}
          style={{ minHeight: 36, fontWeight: 800, color: '#8E3424', textDecoration: 'underline' }}
        >
          {t('result.board')}
        </button>
      </>
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
      <Cta onClick={onAgain}>{t('result.again')}</Cta>
      <Soft onClick={onShare}>{shareLabel}</Soft>
      <Soft onClick={onBoard}>{t('result.boardShort')}</Soft>
    </div>
  )
}

/** M5 bottom sheet / D5 centred card over a dimmed pasture. */
export function ResultView({ model, shareLabel, onAgain, onShare, onBoard }: ResultViewProps) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  return (
    <>
      <div
        className="fadein"
        data-testid="result-overlay"
        style={{ ...OVERLAY, background: desktop ? 'rgba(30,40,20,.35)' : 'rgba(30,40,20,.4)' }}
      />
      <div style={FULL_SCREEN}>
        <Confetti active={model.won} />
      </div>
      <section
        className={desktop ? 'rise' : 'sheetup'}
        aria-label={t('result.area')}
        style={desktop ? SHEET_DESKTOP : SHEET_MOBILE}
      >
        <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.12em', color: 'var(--c-muted-aa)' }}>
          {t(model.won ? 'result.kicker.win' : 'result.kicker.lose', { secret: model.secret })}
        </span>
        <h2 style={{ margin: '-4px 0 0', fontSize: desktop ? 36 : 28, fontWeight: 900 }}>
          {t(model.won ? 'result.headline.win' : 'result.headline.lose')}
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {model.practice ? <Chip>{t('common.practice')}</Chip> : null}
          {model.fallback ? <Chip>{t('common.approx')}</Chip> : null}
        </div>
        {model.won ? <TopBadge model={model} desktop={desktop} /> : null}
        <Stars model={model} size={desktop ? 34 : 28} />
        {model.practice ? <p style={{ ...MUTED, margin: 0 }}>{t('result.practiceNote')}</p> : null}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: desktop ? 10 : 6,
          }}
        >
          <Tile value={model.attempts} label={t('result.stat.attempts')} />
          <Tile value={model.clock} label={t('result.stat.time')} />
          <Tile value={model.score} label={t('result.stat.points')} tint="#F6E3B4" />
          <Tile value={`${model.logic}%`} label={t('result.stat.logic')} />
        </div>
        <Distribution model={model} desktop={desktop} />
        <Tip model={model} />
        <Actions
          desktop={desktop}
          shareLabel={shareLabel}
          onAgain={onAgain}
          onShare={onShare}
          onBoard={onBoard}
        />
      </section>
    </>
  )
}
