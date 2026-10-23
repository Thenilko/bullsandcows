/** QR decoding for the invite scanner: the platform's `BarcodeDetector` when present, else jsQR. */

interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike

const nativeDetector = (): BarcodeDetectorLike | null => {
  const Ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  try {
    return Ctor ? new Ctor({ formats: ['qr_code'] }) : null
  } catch {
    return null
  }
}

/** Whether this page may open the camera at all (secure context with `getUserMedia`). */
export function canScanQr(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    (typeof window === 'undefined' || window.isSecureContext !== false)
  )
}

export interface QrDecoder {
  decode(canvas: HTMLCanvasElement): Promise<string | null>
}

/** Builds the decoder once per scanner; the jsQR fallback loads lazily. */
export async function makeQrDecoder(): Promise<QrDecoder> {
  const native = nativeDetector()
  if (native) {
    return {
      async decode(canvas) {
        const codes = await native.detect(canvas)
        return codes[0]?.rawValue ?? null
      },
    }
  }
  const { default: jsQR } = await import('jsqr')
  return {
    async decode(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx || canvas.width === 0) return null
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      return jsQR(img.data, img.width, img.height)?.data ?? null
    },
  }
}
