import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const SIZE = 176

/** Renders the invite link as a QR code (a friend points the camera at it); the encoder loads lazily. */
export async function inviteQrDataUrl(url: string): Promise<string> {
  const { toDataURL } = await import('qrcode')
  return toDataURL(url, { margin: 1, width: SIZE, color: { dark: '#2E3B24', light: '#FFFDF6' } })
}

export function InviteQr({ url }: { url: string }) {
  const { t } = useTranslation()
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    inviteQrDataUrl(url).then(
      (data) => {
        if (live) setSrc(data)
      },
      () => {
        // no QR: the code and the link above stay usable
      },
    )
    return () => {
      live = false
    }
  }, [url])
  return (
    <div
      style={{ width: SIZE, height: SIZE, borderRadius: 14, background: '#FFFDF6', display: 'grid', placeItems: 'center' }}
      data-testid="invite-qr"
    >
      {src ? <img src={src} width={SIZE} height={SIZE} alt={t('duel.invite.qrAlt')} style={{ borderRadius: 14 }} /> : null}
    </div>
  )
}
