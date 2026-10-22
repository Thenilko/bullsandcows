import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Cta, Soft, Toast } from '../../components/ui'
import { CloseIcon } from '../../components/ui/icons'
import { Sheet } from '../../components/ui/Sheet'
import { ShareCard } from './ShareCard'
import { shareLabels } from './shareLabels'
import type { ShareModel } from './shareModel'
import { useShare, type ShareNotice } from './useShare'

export interface ShareSheetProps {
  model: ShareModel
  onClose(): void
}

const NOTICE_KEY = { copied: 'common.copied', saved: 'share.saved', failed: 'share.failed' } as const

function Notice({ notice }: { notice: ShareNotice | null }) {
  const { t } = useTranslation()
  if (!notice) return null
  return (
    <Toast tick={notice.tick} data-testid="share-notice">
      {t(NOTICE_KEY[notice.kind])}
    </Toast>
  )
}

/** Р1 „Сподели резултата“: the card, the text for the chat and the three actions. */
export function ShareSheet({ model, onClose }: ShareSheetProps) {
  const { t, i18n } = useTranslation()
  const labels = useMemo(() => shareLabels(model, t, i18n.language), [model, t, i18n.language])
  const actions = useShare(model, labels)
  return (
    <Sheet label={t('share.title')} onClose={onClose} testId="share-sheet">
      <Notice notice={actions.notice} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <b style={{ fontSize: 22 }}>{t('share.title')}</b>
        <button type="button" className="iconbox icobtn" aria-label={t('common.close')} onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <ShareCard model={model} labels={labels} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#6B7560', letterSpacing: '.06em' }}>{t('share.textLabel')}</span>
        <pre className="sh-text" data-testid="share-text">
          {model.text}
        </pre>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7560' }}>{t('share.noSpoilers')}</span>
      </div>
      <Cta style={{ minHeight: 56 }} onClick={() => void actions.share()}>
        {t('share.native')}
      </Cta>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Soft onClick={() => void actions.copy()}>{t('share.copy')}</Soft>
        <Soft onClick={() => void actions.save()}>{t('share.save')}</Soft>
      </div>
    </Sheet>
  )
}
