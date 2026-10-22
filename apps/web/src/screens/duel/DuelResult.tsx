import type { ClientMsg, PublicState, RatingChangeDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Shell } from '../../app/layouts/Shell'
import { Card, Confetti, Soft } from '../../components/ui'
import { clearRoomSession } from '../../features/duel/useRoom'
import { clearMySecret } from '../../features/duel/mySecret'
import { useDuelStore } from '../../features/duel/store'
import { rankKeyOf } from '../../lib/rank'
import { sfx } from '../../lib/sound'
import { botLevelKey, fmtClock, outcomeOf, type Outcome } from './duelUtils'
import { RematchButton } from './parts/RematchButton'
import { ResultRows, type ResultRow } from './parts/ResultRows'
import { resultScene } from './scenes'

export interface DuelResultProps {
  roomId: string
  state: PublicState
  send(msg: ClientMsg): void
}

const HEAD_COLOR: Readonly<Record<Outcome, string>> = { win: '#B5452F', lose: '#4A5640', draw: '#4A7FB0' }
const COL = { display: 'flex', flexDirection: 'column', gap: 12 } as const

/** Which `outcome.reason.*` line explains the ending, if any. */
export function reasonKey(reason: string, outcome: Outcome): string | null {
  const side = outcome === 'win' ? 'Opp' : 'Self'
  switch (reason) {
    case 'giveUp':
      return `outcome.reason.forfeit${side}`
    case 'timeout':
      return `outcome.reason.timeout${side}`
    case 'disconnect':
      return `outcome.reason.disconnect${side}`
    case 'cap':
      return 'outcome.reason.ceiling'
    default:
      return null
  }
}

export function DuelResult({ roomId, state, send }: DuelResultProps) {
  const { t, i18n } = useTranslation()
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
  const rows = buildRows(state, outcome, reason, oppName, t('common.youNamed', { name: state.me.username }), bot)
  const secrets = ended?.secrets ?? state.secrets
  const explain = reasonKey(reason, outcome)
  const formatLabel = t(`newGame.format.${state.format}.name`)
  const kicker = bot
    ? t('duel.result.kicker.bot', { level: t(`bot.level.${botLevelKey(state.botLevel)}.name`).toLocaleUpperCase(i18n.language) })
    : t('duel.result.kicker.duel', { format: formatLabel.toLocaleUpperCase(i18n.language) })
  const sub = outcome === 'win' ? t('duel.result.sub.winOpp', { name: oppName }) : outcome === 'draw' ? t('duel.result.sub.draw') : reason === 'solved' ? t('duel.result.sub.loseOpp', { name: oppName }) : t('duel.result.sub.lose')

  function newGame() {
    sfx.play('tap')
    clearRoomSession()
    clearMySecret(roomId)
    useDuelStore.getState().reset()
    void navigate(bot ? '/bot/new' : '/duel/new')
  }

  return (
    <Shell scene={resultScene(outcome === 'win', state.len)} screen="duel">
      <section aria-label={t('result.area')} style={COL}>
        <ResultHeader kicker={kicker} outcome={outcome} sub={sub} explain={explain ? t(explain, { name: oppName }) : null} />
        <ResultRows rows={rows} />
        {rating ? <RatingCard rating={rating} /> : null}
        <div className="inset" style={{ padding: '10px 14px', fontWeight: 800, fontSize: 14, textAlign: 'center' }}>
          {secretsLine(t, state, secrets, xp)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <RematchButton offer={offer} oppName={oppName} onRematch={() => send({ t: 'rematch' })} />
          <Soft onClick={newGame}>{t('duel.result.newGame')}</Soft>
        </div>
      </section>
      <Confetti active={outcome === 'win'} />
    </Shell>
  )
}

function secretsLine(t: ReturnType<typeof useTranslation>['t'], state: PublicState, secrets: PublicState['secrets'], xp: number | null): string {
  if (!secrets) return ''
  const text =
    state.format === 'classic'
      ? t('duel.result.secrets.classic', { theirs: secrets.theirs ?? '—', mine: secrets.mine ?? '—' })
      : t('duel.result.secrets.race', { secret: secrets.mine ?? secrets.theirs ?? '—' })
  return xp === null ? text : t('duel.result.secretsXp', { secrets: text, xp })
}

function buildRows(state: PublicState, outcome: Outcome, reason: string, oppName: string, myName: string, bot: boolean): ResultRow[] {
  const mine = state.me.guesses.some((g) => g.bulls === state.len)
  const theirs = state.opp?.guesses.some((g) => g.bulls === state.len) === true
  const mySolved = mine || (reason === 'solved' && outcome !== 'lose')
  const oppSolved = theirs || (reason === 'solved' && outcome !== 'win')
  const clock = state.startedAt && state.endedAt ? fmtClock(state.endedAt - state.startedAt) : '—'
  return [
    {
      name: myName,
      kind: 'me',
      rankKey: rankKeyOf(state.me),
      species: state.me.avatarSpecies,
      attempts: state.me.guesses.length,
      time: mySolved ? clock : '—',
      solved: mySolved,
    },
    {
      name: oppName,
      kind: bot ? 'bot' : 'human',
      rankKey: state.opp ? rankKeyOf(state.opp) : undefined,
      species: state.opp?.avatarSpecies,
      attempts: state.opp?.guesses.length ?? 0,
      time: oppSolved ? clock : '—',
      solved: oppSolved,
    },
  ]
}

function ResultHeader({ kicker, outcome, sub, explain }: { kicker: string; outcome: Outcome; sub: string; explain: string | null }) {
  const { t } = useTranslation()
  return (
    <div style={{ ...COL, alignItems: 'center', textAlign: 'center', gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.12em', color: 'var(--c-muted-aa)' }}>{kicker}</span>
      <h1 className="boing" style={{ margin: 0, fontSize: 40, fontWeight: 900, lineHeight: 1, color: HEAD_COLOR[outcome] }}>
        {t(`outcome.${outcome}`)}
      </h1>
      <p style={{ margin: 0, fontWeight: 700, color: '#4A5640', lineHeight: 1.45 }}>{sub}</p>
      {explain ? <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#6B7560' }}>{explain}</p> : null}
    </div>
  )
}

function RatingCard({ rating }: { rating: RatingChangeDto }) {
  const { t } = useTranslation()
  return (
    <Card style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '.1em', color: '#6B7560' }}>{t('duel.result.rating')}</span>
        <span style={{ fontWeight: 900, fontSize: 18 }}>{t('duel.result.ratingChange', { from: rating.from, to: rating.to })}</span>
      </div>
      <span className="boing" style={{ fontSize: 30, fontWeight: 900, color: rating.delta >= 0 ? '#2E7D32' : '#B5452F', animationDelay: '.4s' }}>
        {rating.delta >= 0 ? '+' : ''}
        {rating.delta}
      </span>
    </Card>
  )
}
