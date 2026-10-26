import type { FarmDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Cta, Soft } from '../../components/ui'
import type { TextShareActions } from '../../features/share/useShare'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { BODY, HouseGlyph, KICKER, MUTED } from './parts'

export interface FarmCreatedViewProps {
  farm: Pick<FarmDto, 'name' | 'code'>
  /** The invitation text (code and `/ferma/…` link). */
  invite: string
  share: TextShareActions
  onDone(): void
}

/** П3 / ПД6 „Фермата е готова!“: the code, the invitation and how to send it. */
export function FarmCreatedView({ farm, invite, share, onDone }: FarmCreatedViewProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const notice = share.notice
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
        <span className={reduced ? 'md md-gold' : 'md md-gold boing'} style={{ width: 72, height: 72 }} aria-hidden="true">
          <HouseGlyph size={34} />
        </span>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{t('farm.created.title')}</h1>
        <span style={{ fontWeight: 700, color: '#4A5640', overflowWrap: 'anywhere' }}>{t('farm.created.sub', { name: farm.name })}</span>
      </div>
      <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', alignSelf: 'stretch' }}>
        <span style={{ ...KICKER, letterSpacing: '.12em' }}>{t('farm.created.codeLabel')}</span>
        <div style={{ display: 'flex', gap: 8 }} role="img" aria-label={t('farm.created.codeAria', { code: farm.code.split('').join(' ') })}>
          {farm.code.split('').map((ch, i) => (
            <span key={i} className="codebox gold" aria-hidden="true">
              {ch}
            </span>
          ))}
        </div>
        <span style={{ ...MUTED, fontWeight: 700 }}>{t('farm.created.validity')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'stretch', textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--c-muted-aa)', letterSpacing: '.06em' }}>{t('farm.created.inviteLabel')}</span>
        <pre className="sh-text" data-testid="farm-invite">
          {invite}
        </pre>
      </div>
      <Cta style={{ minHeight: 54, alignSelf: 'stretch' }} onClick={() => void share.share()}>
        {t('farm.created.send')}
      </Cta>
      <Soft style={{ alignSelf: 'stretch' }} onClick={() => void share.copy(farm.code)}>
        {notice?.kind === 'copied' ? t('farm.copied') : t('farm.created.copyCode')}
      </Soft>
      <Soft small style={{ alignSelf: 'center' }} onClick={onDone}>
        {t('farm.created.toFarm')}
      </Soft>
      <p role="status" style={{ ...BODY, minHeight: 0, fontSize: 13, textAlign: 'center' }}>
        {notice?.kind === 'failed' ? t('farm.created.copyFailed') : ''}
      </p>
    </>
  )
}
