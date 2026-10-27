import { totalCodes, type Len } from '@bc/game-core'
import { isErrorCode } from '@bc/protocol'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Shell } from '../app/layouts/Shell'
import { Card, Cta, PanelFooter, Pill, Soft, Toggle } from '../components/ui'
import { useSession } from '../features/auth/session'
import { NudgeBanner } from '../features/farm/NudgeBanner'
import { ME_KEY, useMe } from '../features/stats/useMe'
import { createGame, type GameKind } from '../features/solo/api'
import { useAverageAttempts } from '../features/solo/useDistribution'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { ApiError } from '../lib/api'
import { sfx } from '../lib/sound'
import { ModeSwitch } from './duel/parts/SetupFields'
import { modePath } from './duel/useSetupForm'
import { IDLE_SCENE } from './idleScene'
import { WeeklySlot } from './weekly/WeeklySlot'

const LENS: readonly Len[] = [3, 4, 5]
const KINDS: readonly GameKind[] = ['daily', 'free']
// Spacing and sizes follow the shell's compact variables (MobileShell.module.css); desktop keeps the defaults.
const COL = { display: 'flex', flexDirection: 'column', gap: 'var(--panel-gap, 14px)' } as const
const NOTE = { fontSize: 12, fontWeight: 800, color: '#8E3424' } as const

export interface NewGameInitial {
  len?: Len
  zero?: boolean
  kind?: GameKind
}

function errorKey(e: unknown): string {
  if (!(e instanceof ApiError)) return 'error.unknown'
  if (e.status === 0) return 'error.network'
  return e.status === 429
    ? 'error.ERR_RATE_LIMIT'
    : isErrorCode(e.code)
      ? `error.${e.code}`
      : 'error.unknown'
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="setrow">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="setlab">{label}</span>
        {hint ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-muted-aa)' }}>{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function Settings(props: {
  len: Len
  zero: boolean
  kind: GameKind
  onLen(v: Len): void
  onZero(v: boolean): void
  onKind(v: GameKind): void
}) {
  const { t } = useTranslation()
  const { len, zero, kind } = props
  return (
    <Card style={{ padding: 'var(--card-pad, 16px)', ...COL }}>
      <SettingRow label={t('newGame.digits')}>
        <div style={{ display: 'flex', gap: 6 }}>
          {LENS.map((l) => (
            <Pill
              key={l}
              on={l === len}
              style={{ minHeight: 40, minWidth: 48 }}
              onClick={() => props.onLen(l)}
            >
              {l}
            </Pill>
          ))}
        </div>
      </SettingRow>
      <SettingRow
        label={t('newGame.zero.label')}
        hint={t(zero ? 'newGame.zero.on' : 'newGame.zero.off')}
      >
        <Toggle on={zero} onChange={props.onZero} label={t('newGame.zero.aria')} />
      </SettingRow>
      <span style={NOTE}>{t('newGame.codes', { count: totalCodes(len, zero) })}</span>
      <SettingRow label={t('newGame.solo.label')}>
        <div style={{ display: 'flex', gap: 6 }}>
          {KINDS.map((k) => (
            <Pill key={k} on={k === kind} style={{ minHeight: 40 }} onClick={() => props.onKind(k)}>
              {t(`newGame.solo.${k}`)}
            </Pill>
          ))}
        </div>
      </SettingRow>
    </Card>
  )
}

/** /new — solo setup (PasDuel setup with mode=solo), the weekly card on top (П6; `weekly` replaces it in the gallery). */
export function NewGame({ initial, weekly }: { initial?: NewGameInitial; weekly?: React.ReactNode }) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const me = useSession((s) => s.me)
  // Fresh profile on every visit: `currentGameId` is how „Продължи“ knows about a game left through „Меню“.
  const fresh = useMe().data
  const [len, setLen] = useState<Len>(initial?.len ?? me?.profile.defaultLen ?? 4)
  const [zero, setZero] = useState(initial?.zero ?? false)
  const [kind, setKind] = useState<GameKind>(initial?.kind ?? 'daily')
  const avg = useAverageAttempts(len, zero, kind)
  const qc = useQueryClient()
  const create = useMutation({
    mutationFn: () => createGame({ len, zero, kind }),
    onSuccess: (game) => {
      // `me.currentGameId` changes with a new game.
      void qc.invalidateQueries({ queryKey: ME_KEY })
      void navigate(`/play/${game.id}`)
    },
  })

  const digits = t('common.digits', { count: len })
  const mode = t(`play.mode.${kind}`)
  const info =
    avg === undefined
      ? `${digits} · ${mode}`
      : t('play.startInfo', { digits, mode, avg: avg.toFixed(1) })
  const resume = (fresh ?? me)?.currentGameId ?? null

  return (
    <Shell scene={IDLE_SCENE} screen="new">
      <section aria-label={t('newGame.title')} style={COL}>
        <NudgeBanner />
        {weekly ?? <WeeklySlot />}
        <h1
          className="rise"
          style={{ margin: 0, fontSize: desktop ? 40 : 'var(--h1-size, 30px)', fontWeight: 900 }}
        >
          {t('newGame.title')}
        </h1>
        <ModeSwitch
          mode="solo"
          onPick={(m) => {
            sfx.play('tap')
            void navigate(modePath(m))
          }}
        />
        <Settings
          len={len}
          zero={zero}
          kind={kind}
          onLen={setLen}
          onZero={setZero}
          onKind={setKind}
        />
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-muted-aa)' }}>{info}</span>
        <PanelFooter>
          <p
            role="status"
            style={{ margin: 0, minHeight: 18, fontWeight: 800, fontSize: 14, color: '#8A1F0B' }}
          >
            {create.isError ? t(errorKey(create.error)) : ''}
          </p>
          <Cta
            style={{ minHeight: 58, fontSize: 19 }}
            disabled={create.isPending}
            onClick={() => {
              sfx.play('tap')
              create.mutate()
            }}
          >
            {t('newGame.cta.solo')}
          </Cta>
          {resume ? (
            <Soft onClick={() => void navigate(`/play/${resume}`)}>{t('common.continue')}</Soft>
          ) : null}
        </PanelFooter>
      </section>
    </Shell>
  )
}
