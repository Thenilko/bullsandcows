import type { FarmDto } from '@bc/protocol'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { Shell } from '../app/layouts/Shell'
import { Cta } from '../components/ui'
import { Sheet } from '../components/ui/Sheet'
import { UpgradeDialog } from '../features/auth/UpgradeDialog'
import { inviteText } from '../features/farm/invite'
import { useCreateFarm, useIsMember, useJoinFarm, useMyFarm, useNudge } from '../features/farm/useFarm'
import { useShareText } from '../features/share/useShare'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { ApiError } from '../lib/api'
import { sfx } from '../lib/sound'
import { BoardSwitch } from './farm/BoardSwitch'
import { FarmCreatedView } from './farm/FarmCreatedView'
import { FarmJoinView } from './farm/FarmJoinView'
import { FarmView } from './farm/FarmView'
import { BODY } from './farm/parts'
import { IDLE_SCENE } from './idleScene'

const COPIED_MS = 2000

/** The translation key of a failed request (server code, or a network failure). */
export function farmErrorKey(e: unknown): string {
  if (!(e instanceof ApiError) || e.status === 0) return 'error.network'
  return `error.${e.code}`
}

function Chips({ left, right }: { left: string; right?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span className="ps-hud" style={{ fontSize: 15 }}>
        {left}
      </span>
      {right ? <span className="ps-hud">{right}</span> : null}
    </div>
  )
}

/** The farm screens' frame: `sc-farm` on desktop (the 600px framed panel / the 640px column), chips on phones. */
export function FarmShell({ hud, children }: { hud?: ReactNode; children: ReactNode }) {
  const desktop = useIsDesktop()
  return (
    <Shell scene={IDLE_SCENE} screen="farm" hud={desktop ? undefined : hud}>
      {children}
    </Shell>
  )
}

function GuestInvite() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <FarmShell hud={<Chips left={t('farm.hud.title')} />}>
      <BoardSwitch value="farm" />
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{t('farm.join.title')}</h1>
      <p style={BODY}>{t('farm.guest')}</p>
      {open ? <UpgradeDialog /> : <Cta onClick={() => setOpen(true)}>{t('common.createProfile')}</Cta>}
    </FarmShell>
  )
}

/** Р4 / ПД4 with the invite copy and „Напомни“. */
function FarmBoard({ farm }: { farm: FarmDto }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const share = useShareText(inviteText(t, farm.code))
  const nudge = useNudge()
  const [copied, setCopied] = useState(false)
  return (
    <>
      <BoardSwitch value="farm" />
      <FarmView
        farm={farm}
        copied={copied}
        nudging={nudge.isPending ? nudge.variables : null}
        onCopyInvite={() => {
          sfx.play('tap')
          void share.copy().then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), COPIED_MS)
          })
        }}
        onSettings={() => void navigate('/farm/settings')}
        onNudge={(id) => {
          sfx.play('tap')
          nudge.mutate(id)
        }}
      />
      {nudge.isError ? (
        <p role="alert" style={{ ...BODY, color: '#8A1F0B', fontSize: 13 }}>
          {t(farmErrorKey(nudge.error))}
        </p>
      ) : null}
    </>
  )
}

/** П3: a panel of its own on phones, a modal over the farm on desktop. */
function Created({ farm, onDone }: { farm: FarmDto; onDone(): void }) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const invite = inviteText(t, farm.code)
  const share = useShareText(invite)
  const view = <FarmCreatedView farm={farm} invite={invite} share={share} onDone={onDone} />
  if (!desktop) return <FarmShell hud={<Chips left={t('farm.hud.title')} />}>{view}</FarmShell>
  return (
    <FarmShell>
      <FarmBoard farm={farm} />
      <Sheet label={t('farm.created.title')} onClose={onDone} width={520} centered variant="card" testId="farm-created">
        {view}
      </Sheet>
    </FarmShell>
  )
}

/** `/farm` and `/ferma/:code`: the family farm, or creating / joining one (guests are invited to sign up). */
export function Farm() {
  const { t } = useTranslation()
  const { code } = useParams()
  const navigate = useNavigate()
  const member = useIsMember()
  const query = useMyFarm()
  const create = useCreateFarm()
  const join = useJoinFarm()
  const [created, setCreated] = useState(false)

  if (!member) return <GuestInvite />
  const farm = query.data
  if (farm === undefined) {
    return (
      <FarmShell hud={<Chips left={t('farm.hud.title')} />}>
        <p role={query.isError ? 'alert' : 'status'} style={{ fontWeight: 800 }}>
          {query.isError ? t('farm.loadFailed') : t('common.loading')}
        </p>
      </FarmShell>
    )
  }
  if (farm && created) return <Created farm={farm} onDone={() => setCreated(false)} />
  if (farm) {
    return (
      <FarmShell hud={<Chips left={t('farm.hud.board')} right={t('farm.hud.farm')} />}>
        <FarmBoard farm={farm} />
      </FarmShell>
    )
  }
  return (
    <FarmShell hud={<Chips left={t('farm.hud.title')} />}>
      <FarmJoinView
        initialCode={code ? code.toUpperCase().slice(0, 5) : ''}
        creating={create.isPending}
        joining={join.isPending}
        createError={create.isError ? t(farmErrorKey(create.error)) : null}
        joinError={join.isError ? t(farmErrorKey(join.error)) : null}
        onCreate={(name) => {
          sfx.play('tap')
          create.mutate(name, { onSuccess: () => setCreated(true) })
        }}
        onJoin={(c) => {
          sfx.play('tap')
          join.mutate(c, { onSuccess: () => void navigate('/farm', { replace: true }) })
        }}
      />
    </FarmShell>
  )
}
