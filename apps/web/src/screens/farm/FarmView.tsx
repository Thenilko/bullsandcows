import type { FarmDto, FarmMemberDto, FarmTodayDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Podium, RankAvatar } from '../../components/ui'
import type { PodiumRow } from '../../components/ui/Podium'
import { cx } from '../../components/ui/cx'
import { formatClock } from '../play/format'
import { GearGlyph, KICKER, MUTED, TitleRow, UserPlusGlyph } from './parts'

export interface FarmViewProps {
  farm: FarmDto
  /** „Покани · K7Q2M“ copies the invitation; true for a moment after a copy. */
  copied: boolean
  onCopyInvite(): void
  onSettings(): void
  onNudge(userId: string): void
  /** The member whose nudge is being sent (the button waits). */
  nudging?: string | null
}

const COLUMNS = '30px 40px minmax(0, 1fr) 52px 56px'
const STACK_MAX = 6

/** Better first: a win, then fewer attempts, then less time. */
function better(a: FarmTodayDto, b: FarmTodayDto): number {
  if (a.won !== b.won) return a.won ? -1 : 1
  if (a.attempts !== b.attempts) return a.attempts - b.attempts
  return (a.secs ?? Infinity) - (b.secs ?? Infinity)
}

/** Played today first (best first), then the rest in the order they joined. */
export function todayOrder(members: readonly FarmMemberDto[]): FarmMemberDto[] {
  const played = members.filter((m) => m.today).sort((a, b) => better(a.today!, b.today!))
  return [...played, ...members.filter((m) => !m.today)]
}

/** The week's podium: the three with the most points (none without points). */
export function weekPodium(members: readonly FarmMemberDto[]): PodiumRow[] {
  return [...members]
    .filter((m) => m.weekPoints > 0)
    .sort((a, b) => b.weekPoints - a.weekPoints || a.joinedAt - b.joinedAt)
    .slice(0, 3)
    .map((m, i) => ({ rank: (i + 1) as 1 | 2 | 3, name: m.username, score: m.weekPoints, rankKey: m.rankKey, species: m.avatarSpecies }))
}

function Header({ farm, copied, onCopyInvite, onSettings }: Omit<FarmViewProps, 'onNudge'>) {
  const { t } = useTranslation()
  const stack = farm.members.slice(0, STACK_MAX)
  return (
    <section className="card" aria-label={farm.name} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* The count and the settings sit on the kicker's line, so the name keeps the whole width. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 32 }}>
          <span style={KICKER}>{t('farm.kicker')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
            <span className="tag" style={{ background: '#F3EEDF', color: '#4A5640' }}>
              {t('farm.count', { count: farm.members.length, max: farm.maxMembers })}
            </span>
            <button type="button" className="iconbox icobtn" style={{ width: 32, height: 32 }} aria-label={t('farm.settingsAria')} onClick={onSettings}>
              <GearGlyph size={18} />
            </button>
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 900, overflowWrap: 'anywhere' }}>{farm.name}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex' }} aria-hidden="true">
          {stack.map((m, i) => (
            <span key={m.userId} style={{ marginLeft: i === 0 ? 0 : -14, borderRadius: '50%', boxShadow: '0 0 0 3px #FFFDF6', display: 'flex' }}>
              <RankAvatar species={m.avatarSpecies} rankKey={m.rankKey} size={40} />
            </span>
          ))}
        </div>
        <button type="button" className="soft" onClick={onCopyInvite} style={{ minHeight: 40, padding: '0 12px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flex: 'none' }}>
          <UserPlusGlyph size={16} />
          <span aria-live="polite">{copied ? t('farm.copied') : t('farm.invite', { code: farm.code })}</span>
        </button>
      </div>
    </section>
  )
}

function TodayRow({ member, place, onNudge, nudging }: { member: FarmMemberDto; place: number | null } & Pick<FarmViewProps, 'onNudge' | 'nudging'>) {
  const { t } = useTranslation()
  const rank = t(`rank.${member.rankKey}`)
  const role = member.role === 'owner' ? t('farm.owner') : rank
  const name = member.you ? t('farm.you', { name: member.username }) : member.username
  const today = member.today
  return (
    <li className={cx('lbrow', member.you && 'you')} style={{ gridTemplateColumns: COLUMNS }} data-member={member.userId}>
      <span style={{ fontWeight: 900, color: place ? 'var(--c-muted-aa)' : '#9CA394', textAlign: 'center' }}>{place ?? '—'}</span>
      <RankAvatar species={member.avatarSpecies} rankKey={member.rankKey} size={38} />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <b style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</b>
        <span style={{ ...MUTED, fontSize: 11 }}>{today ? role : t('farm.notPlayed', { role })}</span>
      </span>
      {today ? (
        <>
          <span style={{ fontWeight: 800, color: '#4A5640', textAlign: 'right' }}>
            {today.won ? t('farm.attempts', { count: today.attempts }) : t('farm.lost')}
          </span>
          <span style={{ fontWeight: 900, textAlign: 'right' }}>{today.secs === null ? '—' : formatClock(today.secs)}</span>
        </>
      ) : (
        <span style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
          {member.you ? null : (
            <button
              type="button"
              className="pill"
              style={{ minHeight: 34, padding: '0 12px', fontSize: 13 }}
              disabled={member.nudged || nudging === member.userId}
              aria-label={member.nudged ? undefined : t('farm.nudgeAria', { name: member.username })}
              onClick={() => onNudge(member.userId)}
            >
              {member.nudged ? t('farm.nudged') : t('farm.nudge')}
            </button>
          )}
        </span>
      )}
    </li>
  )
}

/** Р4 / ПД4 / ПДН2: the farm card, today's number per member (with „Напомни“) and the week's podium. */
export function FarmView(props: FarmViewProps) {
  const { t } = useTranslation()
  const { farm, onNudge, nudging } = props
  const rows = todayOrder(farm.members)
  const played = farm.members.filter((m) => m.today).length
  const podium = weekPodium(farm.members)
  return (
    <>
      <Header {...props} />
      <TitleRow title={t('farm.todayRow', { number: farm.dailyNumber })} note={t('farm.played', { played, total: farm.members.length })} />
      <ol style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: 0, padding: 0, listStyle: 'none' }} aria-label={t('farm.todayAria')}>
        {rows.map((m, i) => (
          <TodayRow key={m.userId} member={m} place={m.today ? i + 1 : null} onNudge={onNudge} nudging={nudging} />
        ))}
      </ol>
      <TitleRow title={t('farm.week')} note={t('farm.weekEnd')} />
      {podium.length > 0 ? <Podium rows={podium} /> : <p style={{ ...MUTED, margin: 0, fontSize: 13 }}>{t('farm.weekEmpty')}</p>}
    </>
  )
}
