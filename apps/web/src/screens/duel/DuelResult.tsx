import type { ClientMsg, PublicState } from '@bc/protocol'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Shell } from '../../app/layouts/Shell'
import { Chip, Soft } from '../../components/ui'
import { clearMySecret } from '../../features/duel/mySecret'
import { useDuelStore } from '../../features/duel/store'
import { clearRoomSession } from '../../features/duel/useRoom'
import { shareFromDuel, type ShareModel } from '../../features/share/shareModel'
import { ShareSheet } from '../../features/share/ShareSheet'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { sfx } from '../../lib/sound'
import { ResultCard, Tiles } from '../result/ResultCard'
import { buildRows, kickerOf, reasonKey, tilesOf } from './duelResultModel'
import { botLevelKey, outcomeOf } from './duelUtils'
import { RematchButton } from './parts/RematchButton'
import { ResultRows } from './parts/ResultRows'
import { resultScene } from './scenes'

export { reasonKey } from './duelResultModel'

export interface DuelResultProps {
  roomId: string
  state: PublicState
  send(msg: ClientMsg): void
  /** Starts with the share sheet open (dev gallery). */
  sharing?: boolean
}

const MUTED = { margin: 0, fontWeight: 700, color: '#4A5640', lineHeight: 1.45 } as const
const LINK = {
  minHeight: 36,
  fontWeight: 800,
  color: '#8E3424',
  textDecoration: 'underline',
} as const

/** „Дуел · Класически“ / „Срещу Плашилото · Лесно“ — the chip under the title and the kicker's fallback. */
function useModeLabels(state: PublicState) {
  const { t, i18n } = useTranslation()
  const upper = (s: string) => s.toLocaleUpperCase(i18n.language)
  if (state.opponentKind === 'bot') {
    const level = t(`bot.level.${botLevelKey(state.botLevel)}.name`)
    return {
      chip: t('duel.result.mode.bot', { level }),
      kicker: t('duel.result.kicker.bot', { level: upper(level) }),
    }
  }
  const format = t(`newGame.format.${state.format}.name`)
  return {
    chip: t('duel.title.play', { format }),
    kicker: t('duel.result.kicker.duel', { format: upper(format) }),
  }
}

interface ActionsProps {
  rematch: ReactNode
  onNewGame(): void
  onShare(): void
}

/** As the solo result: the main button wide; on phones „Сподели“ is the link under the buttons. */
function Actions({ rematch, onNewGame, onShare }: ActionsProps) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  if (desktop) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
        {rematch}
        <Soft onClick={onNewGame}>{t('duel.result.newGame')}</Soft>
        <Soft onClick={onShare}>{t('common.share')}</Soft>
      </div>
    )
  }
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 10 }}>
        {rematch}
        <Soft onClick={onNewGame}>{t('duel.result.newGame')}</Soft>
      </div>
      <button type="button" onClick={onShare} style={LINK}>
        {t('common.share')}
      </button>
    </>
  )
}

/** The end of a duel or a bot match: the solo result card with both players, the tiles and the rematch. */
export function DuelResult({ roomId, state, send, sharing = false }: DuelResultProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const ended = useDuelStore((s) => s.ended)
  const offer = useDuelStore((s) => s.rematchOffer)
  const snapEnd = useDuelStore((s) => s.snapEnd)
  const rating = ended?.rating ?? snapEnd.rating
  const xp = ended?.xp ?? snapEnd.xp
  const outcome = outcomeOf(state, ended) ?? 'draw'
  const reason = ended?.reason ?? state.outcome?.reason ?? 'solved'
  const bot = state.opponentKind === 'bot'
  const oppName = bot ? t('bot.name') : (state.opp?.username ?? '')
  const mode = useModeLabels(state)
  const myName = t('common.youNamed', { name: state.me.username })
  const rows = buildRows(state, outcome, reason, { me: myName, opp: oppName })
  const explain = reasonKey(reason, outcome)
  const sub =
    outcome === 'win'
      ? t('duel.result.sub.winOpp', { name: oppName })
      : outcome === 'draw'
        ? t('duel.result.sub.draw')
        : reason === 'solved'
          ? t('duel.result.sub.loseOpp', { name: oppName })
          : t('duel.result.sub.lose')
  const gameId = ended?.gameId ?? state.me.gameId ?? null
  const [share, setShare] = useState<ShareModel | null>(() =>
    sharing ? shareFromDuel(state, outcome, oppName, gameId) : null,
  )

  function openShare() {
    sfx.play('tap')
    setShare(shareFromDuel(state, outcome, oppName, gameId))
  }

  function newGame() {
    sfx.play('tap')
    clearRoomSession()
    clearMySecret(roomId)
    useDuelStore.getState().reset()
    void navigate(bot ? '/bot/new' : '/duel/new')
  }

  return (
    <Shell scene={resultScene(outcome === 'win', state.len)} screen="result">
      <ResultCard
        kicker={kickerOf(t, state, ended?.secrets ?? state.secrets, outcome, mode.kicker)}
        title={t(`outcome.${outcome}`)}
        won={outcome === 'win'}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Chip>{mode.chip}</Chip>
        </div>
        <p style={MUTED}>{sub}</p>
        {explain ? (
          <p style={{ ...MUTED, fontSize: 14, fontWeight: 800 }}>{t(explain, { name: oppName })}</p>
        ) : null}
        <ResultRows rows={rows} />
        <Tiles tiles={tilesOf(t, state, xp, rating)} />
        <Actions
          rematch={
            <RematchButton
              offer={offer}
              oppName={oppName}
              onRematch={() => send({ t: 'rematch' })}
            />
          }
          onNewGame={newGame}
          onShare={openShare}
        />
      </ResultCard>
      {share ? <ShareSheet model={share} onClose={() => setShare(null)} /> : null}
    </Shell>
  )
}
