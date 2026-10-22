import { rankKeyForLevel } from '@bc/game-core'
import type { InviteInfoDto } from '@bc/protocol'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { Shell } from '../../app/layouts/Shell'
import { Card, Cta, Soft } from '../../components/ui'
import { duelApi, roomPath } from '../../features/duel/api'
import { ApiError } from '../../lib/api'
import { sfx } from '../../lib/sound'
import { Avatar } from './parts/Avatar'
import { SettingChips } from './parts/SettingChips'
import { IDLE_SCENE } from './scenes'

const COL = { display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' } as const

function errorKey(e: unknown): string {
  return e instanceof ApiError && e.status !== 0 ? `error.${e.code}` : 'error.network'
}

function useInviteJoin(code: string, preview?: InviteInfoDto) {
  const navigate = useNavigate()
  const [info, setInfo] = useState<InviteInfoDto | null>(preview ?? null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (preview) return
    let live = true
    duelApi.inviteInfo(code).then(
      (res) => live && setInfo(res),
      (e: unknown) => live && setError(errorKey(e)),
    )
    return () => {
      live = false
    }
  }, [code, preview])

  async function join() {
    sfx.play('tap')
    setBusy(true)
    setError(null)
    try {
      const seat = await duelApi.joinInvite(code)
      void navigate(roomPath(seat.roomId, seat.token), { replace: true })
    } catch (e) {
      setError(errorKey(e))
      setBusy(false)
    }
  }

  return { info, error, busy, join }
}

/** `/d/:code` — shows who invited you and the match settings before joining. */
export function JoinInvite({ preview }: { preview?: InviteInfoDto } = {}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { code = '' } = useParams()
  const { info, error, busy, join } = useInviteJoin(code, preview)

  const joinable = info?.status === 'waiting'
  return (
    <Shell scene={IDLE_SCENE} screen="new">
      <section aria-label={t('duel.join.title')} style={COL}>
        <h1 className="rise" style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>
          {t('duel.join.title')}
        </h1>
        {info ? (
          <Card style={{ width: '100%', padding: 20, ...COL, gap: 8 }}>
            <Avatar kind="human" rankKey={rankKeyForLevel(info.host.level)} species={info.host.avatarSpecies} size={64} />
            <b style={{ fontSize: 20 }}>{info.host.username}</b>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#4A5640' }}>{t('duel.join.hostLevel', { level: info.host.level })}</span>
            <SettingChips {...info.settings} />
          </Card>
        ) : error ? null : (
          <p role="status" style={{ margin: 0, fontWeight: 800 }}>
            {t('common.loading')}
          </p>
        )}
        {info && !joinable ? <p role="alert" style={{ margin: 0, fontWeight: 800, color: '#8A1F0B' }}>{t('error.ERR_INVITE_EXPIRED')}</p> : null}
        {error ? <p role="alert" style={{ margin: 0, fontWeight: 800, color: '#8A1F0B' }}>{t(error)}</p> : null}
        {joinable ? (
          <Cta disabled={busy} style={{ minHeight: 58, width: '100%', fontSize: 19 }} onClick={() => void join()}>
            {t('duel.join.cta')}
          </Cta>
        ) : null}
        <Soft small onClick={() => void navigate('/duel/new')}>
          {t('duel.toSetup')}
        </Soft>
      </section>
    </Shell>
  )
}
