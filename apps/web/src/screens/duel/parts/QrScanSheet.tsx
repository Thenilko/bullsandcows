import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../../../components/ui/Sheet'
import { makeQrDecoder } from './qrDecode'

export interface QrScanSheetProps {
  onCode(text: string): void
  onClose(): void
}

const SCAN_EVERY_MS = 200
const VIDEO = { width: '100%', maxHeight: '60vh', borderRadius: 16, background: '#2E3B24', objectFit: 'cover' } as const

type Status = 'starting' | 'scanning' | 'denied' | 'unavailable'

/** Opens the back camera and reads the first QR code in view (the invite link); closes itself on a hit. */
export function QrScanSheet({ onCode, onClose }: QrScanSheetProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('starting')

  useEffect(() => {
    let live = true
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setInterval> | null = null
    const canvas = document.createElement('canvas')

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch (err) {
        if (live) setStatus(err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'unavailable')
        return
      }
      const video = videoRef.current
      if (!live || !video) return
      video.srcObject = stream
      await video.play().catch(() => undefined)
      const decoder = await makeQrDecoder()
      if (!live) return
      setStatus('scanning')
      let busy = false
      timer = setInterval(() => {
        if (busy || video.readyState < 2) return
        busy = true
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d', { willReadFrequently: true })?.drawImage(video, 0, 0)
        decoder
          .decode(canvas)
          .then((text) => {
            if (live && text) onCode(text)
          })
          .catch(() => undefined)
          .finally(() => {
            busy = false
          })
      }, SCAN_EVERY_MS)
    }
    void start()

    return () => {
      live = false
      if (timer) clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [onCode])

  return (
    <Sheet label={t('duel.joinCode.scanTitle')} onClose={onClose} width={460} testId="qr-scan">
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{t('duel.joinCode.scanTitle')}</h2>
      <video ref={videoRef} playsInline muted style={VIDEO} aria-label={t('duel.joinCode.scanVideo')} />
      <p role="status" style={{ margin: 0, fontWeight: 700, color: status === 'scanning' ? '#4A5640' : '#8A1F0B', textAlign: 'center' }}>
        {t(`duel.joinCode.scan.${status}`)}
      </p>
      <button type="button" className="soft" onClick={onClose}>
        {t('notebook.close')}
      </button>
    </Sheet>
  )
}
