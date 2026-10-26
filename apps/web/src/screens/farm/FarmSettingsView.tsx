import { FARM_NAME_MAX, type FarmDto } from '@bc/protocol'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { RankAvatar, Soft } from '../../components/ui'
import { Sheet } from '../../components/ui/Sheet'
import { InviteQr } from '../duel/parts/InviteQr'
import { DANGER, ERROR, MUTED, TitleRow } from './parts'

export interface FarmSettingsViewProps {
  farm: FarmDto
  /** The `/ferma/…` link for the QR. */
  link: string
  busy: boolean
  /** Translated error of the last change, if it failed. */
  error?: string | null
  onRename(name: string): void
  onNewCode(): void
  onRemove(userId: string): void
  onLeave(): void
}

const PILL_DANGER = { minHeight: 34, padding: '0 12px', fontSize: 13, ...DANGER } as const

function NameField({ farm, busy, onRename }: Pick<FarmSettingsViewProps, 'farm' | 'busy' | 'onRename'>) {
  const { t } = useTranslation()
  const [name, setName] = useState(farm.name)
  const owner = farm.role === 'owner'
  const clean = name.trim()
  const changed = clean !== '' && clean !== farm.name
  function submit(e: FormEvent) {
    e.preventDefault()
    if (changed) onRename(clean)
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor="farm-name" style={{ fontWeight: 800, fontSize: 14 }}>
        {t('farm.join.name')}
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="farm-name" className="field" style={{ flex: 1, minWidth: 0 }} value={name} maxLength={FARM_NAME_MAX} readOnly={!owner} onChange={(e) => setName(e.target.value)} />
        {owner && changed ? (
          <Soft type="submit" disabled={busy} style={{ minHeight: 48 }}>
            {t('farm.settings.save')}
          </Soft>
        ) : null}
      </div>
    </form>
  )
}

function CodeCard({ farm, link, busy, onNewCode }: Pick<FarmSettingsViewProps, 'farm' | 'link' | 'busy' | 'onNewCode'>) {
  const { t } = useTranslation()
  const [qr, setQr] = useState(false)
  return (
    <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <b>{t('farm.settings.code')}</b>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-muted-aa)', letterSpacing: '.2em' }} data-testid="farm-code">
          {farm.code}
        </span>
      </span>
      <span style={{ display: 'flex', gap: 8 }}>
        <Soft style={{ minHeight: 40, fontSize: 14 }} onClick={() => setQr(true)}>
          {t('farm.settings.qr')}
        </Soft>
        {farm.role === 'owner' ? (
          <Soft style={{ minHeight: 40, fontSize: 14 }} disabled={busy} onClick={onNewCode}>
            {t('farm.settings.newCode')}
          </Soft>
        ) : null}
      </span>
      {qr ? (
        <Sheet label={t('farm.settings.qr')} onClose={() => setQr(false)} centered width={420}>
          <b style={{ fontSize: 20 }}>{farm.name}</b>
          <InviteQr url={link} />
          <span style={{ ...MUTED, overflowWrap: 'anywhere' }}>{link}</span>
          <Soft onClick={() => setQr(false)}>{t('common.close')}</Soft>
        </Sheet>
      ) : null}
    </div>
  )
}

/** П5 / ПД7 „Настройки на фермата“: name, invite code, members (the owner removes), leaving. */
export function FarmSettingsView(props: FarmSettingsViewProps) {
  const { t } = useTranslation()
  const { farm, busy, error, onRemove, onLeave } = props
  const [confirmLeave, setConfirmLeave] = useState(false)
  const owner = farm.role === 'owner'
  return (
    <>
      <h1 className="sr-only">{t('farm.settings.title')}</h1>
      <NameField key={farm.name} farm={farm} busy={busy} onRename={props.onRename} />
      <CodeCard farm={farm} link={props.link} busy={busy} onNewCode={props.onNewCode} />
      {error ? (
        <p role="alert" style={ERROR}>
          {error}
        </p>
      ) : null}
      <TitleRow title={t('farm.settings.members')} note={t('farm.settings.count', { count: farm.members.length, max: farm.maxMembers })} />
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
        {farm.members.map((m) => (
          <li key={m.userId} className="unl" data-member={m.userId}>
            <RankAvatar species={m.avatarSpecies} rankKey={m.rankKey} size={40} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <b style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.you ? t('farm.you', { name: m.username }) : m.username}</b>
              <span style={MUTED}>{m.role === 'owner' ? t('farm.settings.ownerRole') : t('farm.settings.memberRole')}</span>
            </span>
            {owner && !m.you ? (
              <button type="button" className="pill" style={PILL_DANGER} disabled={busy} aria-label={t('farm.settings.removeAria', { name: m.username })} onClick={() => onRemove(m.userId)}>
                {t('farm.settings.remove')}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <Soft style={DANGER} disabled={busy} onClick={() => (confirmLeave ? onLeave() : setConfirmLeave(true))}>
        {confirmLeave ? t('farm.settings.leaveConfirm') : t('farm.settings.leave')}
      </Soft>
      <span style={{ ...MUTED, fontWeight: 700, textAlign: 'center' }}>{t('farm.settings.leaveNote')}</span>
    </>
  )
}
