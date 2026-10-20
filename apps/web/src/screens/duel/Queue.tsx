import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { Shell } from '../../app/layouts/Shell'
import { Card, Cta, Soft } from '../../components/ui'
import { duelApi, roomPath, saveInvite } from '../../features/duel/api'
import { useQueue, type QueueError } from '../../features/duel/useQueue'
import { useSession } from '../../features/auth/session'
import { useEffect, useState } from 'react'
import { ApiError } from '../../lib/api'
import { Avatar } from './parts/Avatar'
import { parseSettings, type MatchSettings } from './parts/params'
import { SettingChips } from './parts/SettingChips'
import { fmtClock } from './duelUtils'
import { WAIT_SCENE } from './scenes'

const SUGGEST_AFTER_MS = 20_000
const WINDOW_STEP_MS = 5000
const WINDOW_BASE = 75
const WINDOW_MAX = 525
const MAX_LEVEL_STEPS = 6

const COLUMN = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' } as const
const RING_BOX = { position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 6 } as const
const DOTS = (
  <span className="dots" aria-hidden="true">
    <span>.</span>
    <span>.</span>
    <span>.</span>
  </span>
)

/** Share of the 525-point rating window searched so far (75 + 75 per 5 s, capped). */
export function windowShare(elapsedMs: number): number {
  return Math.min(WINDOW_BASE + WINDOW_BASE * Math.floor(elapsedMs / WINDOW_STEP_MS), WINDOW_MAX) / WINDOW_MAX
}

export function Queue() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const settings = parseSettings(params)
  const queue = useQueue(settings)
  const level = useSession((s) => s.me?.level ?? 1)
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    if (queue.matched) void navigate(roomPath(queue.matched.roomId, queue.matched.token), { replace: true })
  }, [queue.matched, navigate])

  function cancel() {
    queue.leave()
    void navigate('/duel/new')
  }

  async function invite() {
    setInviteError(null)
    try {
      const created = await duelApi.createInvite(settings)
      queue.leave()
      saveInvite(created)
      void navigate(`/duel/invite/${created.code}`, { state: created })
    } catch (e) {
      setInviteError(t(e instanceof ApiError && e.status !== 0 ? `error.${e.code}` : 'error.network'))
    }
  }

  return (
    <QueueView
      settings={settings}
      elapsedMs={queue.elapsedMs}
      level={level}
      error={queue.error}
      showSuggest={queue.suggestInvite || queue.elapsedMs >= SUGGEST_AFTER_MS}
      inviteError={inviteError}
      onInvite={() => void invite()}
      onCancel={cancel}
      onProfile={() => void navigate('/login')}
    />
  )
}

export interface QueueViewProps {
  settings: MatchSettings
  elapsedMs: number
  level: number
  error: QueueError | null
  showSuggest: boolean
  inviteError: string | null
  onInvite(): void
  onCancel(): void
  onProfile(): void
}

export function QueueView({ settings, elapsedMs, level, error, showSuggest, inviteError, onInvite, onCancel, onProfile }: QueueViewProps) {
  const { t } = useTranslation()
  return (
    <Shell scene={WAIT_SCENE} sceneSide>
      <section aria-label={t('duel.title.queue')} style={COLUMN}>
        {error === 'guest' ? (
          <GuestBlock onProfile={onProfile} onBack={onCancel} />
        ) : (
          <>
            <div style={RING_BOX}>
              <span className="ring" />
              <span className="ring" style={{ animationDelay: '.8s' }} />
              <span className="ring" style={{ animationDelay: '1.6s' }} />
              <Avatar kind="me" size={76} />
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>
              {t('duel.queue.title')}
              {DOTS}
            </h1>
            <span style={{ fontSize: 36, fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{fmtClock(elapsedMs)}</span>
            <WindowCard elapsedMs={elapsedMs} level={level} />
            <SettingChips {...settings} />
            {error ? (
              <p role="alert" style={{ margin: 0, fontWeight: 800, color: '#8A1F0B' }}>
                {t('error.network')}
              </p>
            ) : null}
            {showSuggest ? (
              <Card className="rise" style={{ width: '100%', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontWeight: 800, lineHeight: 1.45 }}>{t('duel.queue.noMatch')}</span>
                <Soft small onClick={onInvite}>
                  {t('duel.queue.suggestInvite')}
                </Soft>
                {inviteError ? (
                  <span role="alert" style={{ fontWeight: 800, color: '#8A1F0B' }}>
                    {inviteError}
                  </span>
                ) : null}
              </Card>
            ) : null}
            <Soft style={{ width: '100%' }} onClick={onCancel}>
              {t('duel.queue.cancel')}
            </Soft>
          </>
        )}
      </section>
    </Shell>
  )
}

function GuestBlock({ onProfile, onBack }: { onProfile(): void; onBack(): void }) {
  const { t } = useTranslation()
  return (
    <>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{t('duel.queue.title')}</h1>
      <p role="alert" style={{ margin: 0, fontWeight: 800, lineHeight: 1.5 }}>
        {t('common.guestOnly')}
      </p>
      <Cta onClick={onProfile}>{t('common.createProfile')}</Cta>
      <Soft onClick={onBack}>{t('duel.toSetup')}</Soft>
    </>
  )
}

/** Level range and the widening search window. */
function WindowCard({ elapsedMs, level }: { elapsedMs: number; level: number }) {
  const { t } = useTranslation()
  const steps = Math.min(MAX_LEVEL_STEPS, Math.floor(elapsedMs / WINDOW_STEP_MS))
  return (
    <Card style={{ width: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
      <div className="setrow">
        <span className="setlab">{t('duel.queue.similarLevel')}</span>
        <b>{t('duel.queue.levelRange', { lo: Math.max(1, level - 1 - steps), hi: level + 1 + steps })}</b>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#ECE5D2', overflow: 'hidden' }}>
        <div data-testid="range-bar" style={{ height: '100%', width: `${windowShare(elapsedMs) * 100}%`, background: '#86C462', borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7560' }}>{t('duel.queue.widening')}</span>
    </Card>
  )
}
