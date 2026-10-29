import type { InviteDto } from '@bc/protocol'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { Shell } from '../../app/layouts/Shell'
import { Card, Soft } from '../../components/ui'
import { clearInvite, readInvite, roomPath } from '../../features/duel/api'
import { clearRoomSession, useRoom } from '../../features/duel/useRoom'
import { useNow } from '../../hooks/useNow'
import { sfx } from '../../lib/sound'
import { fmtClock } from './duelUtils'
import type { MatchSettings } from './parts/params'
import { InviteQr } from './parts/InviteQr'
import { SettingChips } from './parts/SettingChips'
import { WAIT_SCENE } from './scenes'

const COPIED_MS = 2000
const COL = { display: 'flex', flexDirection: 'column', gap: 14 } as const

export type CopyState = 'idle' | 'copied' | 'failed'

/** Host waiting screen: resolves the invite (router state, then sessionStorage) and holds the seat. */
export function Invite() {
  const { code = '' } = useParams()
  const loc = useLocation()
  const fromState = loc.state as Partial<InviteDto> | null
  const invite = fromState?.code === code && fromState.url && fromState.roomId && fromState.token ? (fromState as InviteDto) : readInvite(code)
  if (!invite) return <Navigate to="/duel/new" replace />
  return <InviteWaiting invite={invite} />
}

function useInviteActions(invite: InviteDto) {
  const { t } = useTranslation()
  const [copy, setCopy] = useState<CopyState>('idle')

  useEffect(() => {
    if (copy === 'idle') return
    const id = setTimeout(() => setCopy('idle'), COPIED_MS)
    return () => clearTimeout(id)
  }, [copy])

  async function copyLink() {
    sfx.play('tap')
    try {
      await navigator.clipboard.writeText(invite.url)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  async function share() {
    sfx.play('tap')
    if (typeof navigator.share !== 'function') return copyLink()
    try {
      await navigator.share({ url: invite.url, title: t('duel.invite.title') })
    } catch {
      // user dismissed the share sheet
    }
  }

  return { copy, copyLink, share }
}

function InviteWaiting({ invite }: { invite: InviteDto }) {
  const navigate = useNavigate()
  const room = useRoom(invite.roomId, invite.token)
  const [startedAt] = useState(() => Date.now())
  const now = useNow(1000)
  const { copy, copyLink, share } = useInviteActions(invite)
  const joined = room.state?.opp != null

  useEffect(() => {
    if (!joined) return
    clearInvite()
    void navigate(roomPath(invite.roomId, invite.token), { replace: true })
  }, [joined, invite.roomId, invite.token, navigate])

  function cancel() {
    clearInvite()
    clearRoomSession()
    void navigate('/duel/new')
  }

  const settings = room.state ? { len: room.state.len, zero: room.state.zero, format: room.state.format } : null
  return (
    <InviteView
      invite={invite}
      settings={settings}
      copy={copy}
      expired={room.status === 'closed'}
      elapsedMs={now - startedAt}
      onCopy={() => void copyLink()}
      onShare={() => void share()}
      onCancel={cancel}
    />
  )
}

export interface InviteViewProps {
  invite: InviteDto
  settings: MatchSettings | null
  copy: CopyState
  expired: boolean
  elapsedMs: number
  onCopy(): void
  onShare(): void
  onCancel(): void
}

export function InviteView({ invite, settings, copy, expired, elapsedMs, onCopy, onShare, onCancel }: InviteViewProps) {
  const { t } = useTranslation()
  const copyLabel = copy === 'copied' ? t('common.copied') : copy === 'failed' ? t('common.copyFailed') : t('duel.invite.copyLink')
  return (
    <Shell scene={WAIT_SCENE} screen="new" title={t('duel.title.invite')}>
      <section aria-label={t('duel.title.invite')} style={COL}>
        <h1 className="rise" style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>
          {t('duel.invite.title')}
        </h1>
        <p style={{ margin: 0, fontWeight: 700, color: '#4A5640', lineHeight: 1.5 }}>{t('duel.invite.text')}</p>
        <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '.14em', color: '#6B7560' }}>{t('duel.invite.codeLabel')}</span>
          <span className="boing" style={{ fontSize: 44, fontWeight: 900, letterSpacing: '.14em' }}>
            {invite.code}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7560', wordBreak: 'break-all' }}>{invite.url}</span>
          <InviteQr url={invite.url} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7560' }}>{t('duel.invite.qrHint')}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7560' }}>{t('duel.invite.validity')}</span>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <Soft onClick={onCopy}>{copyLabel}</Soft>
          <Soft onClick={onShare}>{t('common.share')}</Soft>
        </div>
        {settings ? <SettingChips {...settings} /> : null}
        {expired ? (
          <p role="alert" style={{ margin: 0, fontWeight: 800, color: '#8A1F0B', textAlign: 'center' }}>
            {t('duel.invite.expired')}
          </p>
        ) : (
          <p role="status" style={{ margin: 0, textAlign: 'center', fontWeight: 800 }}>
            {t('duel.invite.waiting')}
            <span className="dots" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>{' '}
            {fmtClock(elapsedMs)}
          </p>
        )}
        <Soft small onClick={onCancel}>
          {t('duel.invite.cancel')}
        </Soft>
      </section>
    </Shell>
  )
}
